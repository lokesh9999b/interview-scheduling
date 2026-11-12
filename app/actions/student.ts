"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canBook, BOOKING_CUTOFF_HOURS, MAX_RESCHEDULES } from "@/lib/state-machine";
import { bookingConfirmed } from "@/lib/messages";
import { formatIstDayLong, formatIstTimeRange } from "@/lib/time";

type ActionResult = { ok: true } | { error: string };

class SlotTakenError extends Error {}

export async function bookSlot(input: {
  slotId: string;
  badgeId: string;
  rescheduleFrom?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT" || !user.studentProfileId) {
    return { error: "Switch to a student account to book an interview." };
  }

  const progress = await prisma.badgeProgress.findUnique({
    where: { studentId_badgeId: { studentId: user.studentProfileId, badgeId: input.badgeId } },
    include: { badge: { include: { track: true } }, student: { include: { user: true } } },
  });
  if (!progress) return { error: "You are not eligible for this badge yet." };

  const active = await prisma.interview.findFirst({
    where: {
      studentId: user.studentProfileId,
      badgeId: input.badgeId,
      status: { in: ["BOOKED", "AWAITING_OUTCOME"] },
    },
    include: { events: { where: { fromState: "BOOKED", toState: "BOOKED" } } },
  });

  if (input.rescheduleFrom) {
    if (!active || active.id !== input.rescheduleFrom) {
      return { error: "That interview can no longer be rescheduled." };
    }
    const eligibility = canBook({
      progressStatus: progress.status,
      cooldownUntil: progress.cooldownUntil,
      attemptsUsed: progress.attemptsUsed,
      maxAttempts: progress.badge.maxAttempts,
      hasActiveInterview: false,
      attendancePct: progress.student.attendancePct,
      registrationStatus: progress.student.registrationStatus,
      conductStatus: progress.student.conductStatus,
    });
    if (!eligibility.ok) return { error: eligibility.reason };
    if (active.events.length >= MAX_RESCHEDULES) {
      return { error: `You've reached the limit of ${MAX_RESCHEDULES} reschedules for this interview.` };
    }
    if (active.startsAt.getTime() - Date.now() < BOOKING_CUTOFF_HOURS * 3_600_000) {
      return {
        error:
          "You're inside the 24-hour window, so this one needs Interview Ops. Email interviews@grit.niatindia.com and they'll move it for you.",
      };
    }
  } else {
    const check = canBook({
      progressStatus: progress.status,
      cooldownUntil: progress.cooldownUntil,
      attemptsUsed: progress.attemptsUsed,
      maxAttempts: progress.badge.maxAttempts,
      hasActiveInterview: Boolean(active),
      attendancePct: progress.student.attendancePct,
      registrationStatus: progress.student.registrationStatus,
      conductStatus: progress.student.conductStatus,
    });
    if (!check.ok) return { error: check.reason };
  }

  const slot = await prisma.interviewSlot.findUnique({
    where: { id: input.slotId },
    include: { interviewer: { include: { user: true } }, lock: true },
  });
  if (!slot) return { error: "That slot no longer exists." };
  if (slot.lock) return { error: "That slot was just taken. Pick another one below." };
  if (slot.status !== "OPEN") return { error: "That slot was just taken. Pick another one below." };

  const cutoff = new Date(Date.now() + BOOKING_CUTOFF_HOURS * 3_600_000);
  if (slot.startsAt < cutoff) {
    return { error: "Slots close 24 hours before the interview. Choose a later one." };
  }
  if (input.rescheduleFrom && active && active.slotId === slot.id) {
    return { error: "That's the same slot you're already booked into." };
  }

  const attemptNo = input.rescheduleFrom ? (active?.attemptNo ?? progress.attemptsUsed + 1) : progress.attemptsUsed + 1;

  try {
    await prisma.$transaction(async (tx) => {
      if (input.rescheduleFrom && active) {
        await tx.slotLock.deleteMany({ where: { interviewId: active.id } });
        await tx.interviewSlot.update({
          where: { id: active.slotId },
          data: { status: "OPEN", version: { increment: 1 } },
        });
      }

      const claimed = await tx.interviewSlot.updateMany({
        where: { id: slot.id, status: "OPEN", startsAt: { gte: cutoff } },
        data: { status: "BOOKED", version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new SlotTakenError();

      if (input.rescheduleFrom && active) {
        await tx.interview.update({
          where: { id: active.id },
          data: {
            slotId: slot.id,
            interviewerId: slot.interviewer.userId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: "BOOKED",
            meetingUrl: `${slot.interviewer.meetingBaseUrl}-${active.id.slice(-4)}`,
            bookedAt: new Date(),
          },
        });
        await tx.slotLock.create({ data: { slotId: slot.id, interviewId: active.id } });
        await tx.interviewEvent.create({
          data: {
            interviewId: active.id,
            fromState: "BOOKED",
            toState: "BOOKED",
            actorId: user.id,
            actorRole: "STUDENT",
            reason: `Rescheduled to ${formatIstDayLong(slot.startsAt)} ${formatIstTimeRange(slot.startsAt, slot.endsAt)} IST`,
          },
        });
        await tx.notification.create({
          data: {
            userId: user.id,
            interviewId: active.id,
            templateKey: "RESCHEDULED",
            title: `Interview moved to ${formatIstDayLong(slot.startsAt)}`,
            body: `Your Level Clearance Interview for ${progress.badge.track.name} · ${progress.badge.name} is now on ${formatIstDayLong(slot.startsAt)} at ${formatIstTimeRange(slot.startsAt, slot.endsAt)} IST with ${slot.interviewer.user.name}.\n\nThe old slot has been released. Your Meet link is unchanged.`,
            ctaLabel: "View interview",
            ctaHref: `/student/interviews/${active.id}`,
          },
        });
        return active.id;
      }

      const interview = await tx.interview.create({
        data: {
          studentId: user.studentProfileId!,
          badgeId: input.badgeId,
          slotId: slot.id,
          interviewerId: slot.interviewer.userId,
          attemptNo,
          status: "BOOKED",
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          meetingUrl: `${slot.interviewer.meetingBaseUrl}-${Math.random().toString(36).slice(2, 6)}`,
        },
      });
      await tx.slotLock.create({ data: { slotId: slot.id, interviewId: interview.id } });
      await tx.badgeProgress.update({
        where: { id: progress.id },
        data: { status: "BOOKED" },
      });
      await tx.interviewEvent.create({
        data: {
          interviewId: interview.id,
          fromState: "ELIGIBLE",
          toState: "BOOKED",
          actorId: user.id,
          actorRole: "STUDENT",
          reason: "Slot confirmed",
        },
      });

      const copy = bookingConfirmed({
        studentName: progress.student.user.name,
        trackName: progress.badge.track.name,
        badgeName: progress.badge.name,
        interviewerName: slot.interviewer.user.name,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        meetingUrl: interview.meetingUrl,
        interviewId: interview.id,
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          interviewId: interview.id,
          templateKey: copy.templateKey,
          title: copy.title,
          body: copy.body,
          ctaLabel: copy.ctaLabel,
          ctaHref: copy.ctaHref,
        },
      });
      return interview.id;
    });
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { error: "That slot was just taken. Pick another one — the list has refreshed." };
    }
    throw error;
  }

  revalidatePath("/student");
  revalidatePath("/student/book");
  revalidatePath("/interviewer/schedule");
  redirect("/student?booked=1");
}

export async function cancelInterview(interviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT" || !user.studentProfileId) return { error: "Not a student account." };

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { student: true },
  });
  if (!interview || interview.studentId !== user.studentProfileId) return { error: "Interview not found." };
  if (interview.status !== "BOOKED") return { error: "Only a booked interview can be cancelled." };

  if (interview.startsAt.getTime() - Date.now() < BOOKING_CUTOFF_HOURS * 3_600_000) {
    return {
      error:
        "You're inside the 24-hour window. Email interviews@grit.niatindia.com and Interview Ops will handle it — your attempt won't be used.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.interview.update({
      where: { id: interview.id },
      data: {
        status: "CANCELLED_STUDENT",
        cancelledAt: new Date(),
        cancelledBy: "STUDENT",
        cancelReason: "Cancelled by student",
      },
    });
    await tx.slotLock.deleteMany({ where: { interviewId: interview.id } });
    await tx.interviewSlot.update({
      where: { id: interview.slotId },
      data: { status: "OPEN", version: { increment: 1 } },
    });
    await tx.badgeProgress.update({
      where: { studentId_badgeId: { studentId: interview.studentId, badgeId: interview.badgeId } },
      data: { status: "ELIGIBLE" },
    });
    await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        fromState: "BOOKED",
        toState: "CANCELLED_STUDENT",
        actorId: user.id,
        actorRole: "STUDENT",
        reason: "Cancelled more than 24h before the slot",
      },
    });
    await tx.notification.create({
      data: {
        userId: user.id,
        interviewId: interview.id,
        templateKey: "CANCELLED",
        title: "Interview cancelled",
        body: "Your slot has been released and no attempt was used. You can book a new one whenever you're ready.",
        ctaLabel: "Book a slot",
        ctaHref: "/student/book",
      },
    });
  });

  revalidatePath("/student");
  revalidatePath("/student/book");
  revalidatePath("/interviewer/schedule");
  return { ok: true };
}
