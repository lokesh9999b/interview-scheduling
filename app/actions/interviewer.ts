"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cooldownFor, OUTCOME_TO_STATUS } from "@/lib/state-machine";
import { resultMessage } from "@/lib/messages";
import { regenerateSlots } from "@/lib/slots";

type ActionResult = { ok: true } | { error: string };

function credentialId(trackName: string, level: string) {
  const track = trackName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `GRIT-${track}-${level.slice(0, 3)}-${year}-${suffix}`;
}

export async function recordOutcome(input: {
  interviewId: string;
  outcome: "PASS" | "FAIL" | "RETAKE";
  note: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" && user.role !== "ADMIN") {
    return { error: "Only an interviewer or Interview Ops can record an outcome." };
  }

  const interview = await prisma.interview.findUnique({
    where: { id: input.interviewId },
    include: {
      badge: { include: { track: true } },
      student: { include: { user: true } },
      interviewer: true,
    },
  });
  if (!interview) return { error: "Interview not found." };
  if (user.role === "INTERVIEWER" && interview.interviewerId !== user.id) {
    return { error: "This interview belongs to another interviewer." };
  }
  if (!["BOOKED", "AWAITING_OUTCOME"].includes(interview.status)) {
    return { error: "The outcome for this interview is already recorded." };
  }

  const now = new Date();
  const progressStatus = OUTCOME_TO_STATUS[input.outcome];
  const cooldown = cooldownFor(interview.badge, input.outcome, now);
  const passed = input.outcome === "PASS";

  const credential = passed ? credentialId(interview.badge.track.name, interview.badge.level) : null;

  await prisma.$transaction(async (tx) => {
    await tx.interview.update({
      where: { id: interview.id },
      data: {
        status: progressStatus,
        outcome: input.outcome,
        outcomeNote: input.note || null,
        outcomeAt: now,
        outcomeBy: user.id,
      },
    });

    await tx.slotLock.deleteMany({ where: { interviewId: interview.id } });
    await tx.interviewSlot.update({
      where: { id: interview.slotId },
      data: { status: "COMPLETED" },
    });

    await tx.badgeProgress.update({
      where: {
        studentId_badgeId: { studentId: interview.studentId, badgeId: interview.badgeId },
      },
      data: {
        status: progressStatus,
        attemptsUsed: { increment: 1 },
        cooldownUntil: cooldown,
        awardedAt: passed ? now : undefined,
        credentialId: credential ?? undefined,
      },
    });

    if (passed) {
      await tx.studentProfile.update({
        where: { id: interview.studentId },
        data: {
          miles: { increment: interview.badge.milesAward },
          qualiflyerAt: now,
        },
      });
    }

    await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        fromState: interview.status,
        toState: progressStatus,
        actorId: user.id,
        actorRole: user.role,
        reason: input.note || null,
      },
    });

    const copy = resultMessage(input.outcome, {
      studentName: interview.student.user.name,
      trackName: interview.badge.track.name,
      badgeName: interview.badge.name,
      interviewerName: interview.interviewer.name,
      note: input.note,
      attemptNo: interview.attemptNo,
      maxAttempts: interview.badge.maxAttempts,
      credentialId: credential,
      milesAward: interview.badge.milesAward,
      retakeDate: cooldown,
      interviewId: interview.id,
    });

    await tx.notification.create({
      data: {
        userId: interview.student.userId,
        interviewId: interview.id,
        templateKey: copy.templateKey,
        title: copy.title,
        body: copy.body,
        ctaLabel: copy.ctaLabel,
        ctaHref: copy.ctaHref,
      },
    });
  });

  revalidatePath("/interviewer/schedule");
  revalidatePath("/admin/students");
  revalidatePath("/student");
  return { ok: true };
}

export async function markNoShow(interviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" && user.role !== "ADMIN") {
    return { error: "Not allowed." };
  }

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { badge: { include: { track: true } }, student: { include: { user: true } }, interviewer: true },
  });
  if (!interview) return { error: "Interview not found." };
  if (user.role === "INTERVIEWER" && interview.interviewerId !== user.id) {
    return { error: "This interview belongs to another interviewer." };
  }
  if (!["BOOKED", "AWAITING_OUTCOME"].includes(interview.status)) {
    return { error: "This interview is already closed." };
  }

  const now = new Date();
  const cooldown = new Date(now.getTime() + 7 * 86_400_000);

  await prisma.$transaction(async (tx) => {
    await tx.interview.update({
      where: { id: interview.id },
      data: { status: "NO_SHOW", noShowAt: now, outcomeNote: "Marked no-show after a 10-minute wait." },
    });
    await tx.slotLock.deleteMany({ where: { interviewId: interview.id } });
    await tx.interviewSlot.update({ where: { id: interview.slotId }, data: { status: "COMPLETED" } });
    await tx.badgeProgress.update({
      where: { studentId_badgeId: { studentId: interview.studentId, badgeId: interview.badgeId } },
      data: { status: "NO_SHOW", attemptsUsed: { increment: 1 }, cooldownUntil: cooldown },
    });
    await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        fromState: interview.status,
        toState: "NO_SHOW",
        actorId: user.id,
        actorRole: user.role,
        reason: "No-show after 10-minute grace period",
      },
    });
    await tx.notification.create({
      data: {
        userId: interview.student.userId,
        interviewId: interview.id,
        templateKey: "NO_SHOW",
        title: "You missed your interview",
        body: `The interviewer waited 10 minutes for your ${interview.badge.track.name} · ${interview.badge.name} interview on ${interview.startsAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}.\n\nOne attempt has been used and your next booking unlocks in 7 days. If something went wrong on your side, reply to this message — Interview Ops can reinstate the attempt.`,
        ctaLabel: "View status",
        ctaHref: "/student",
      },
    });
  });

  revalidatePath("/interviewer/schedule");
  revalidatePath("/student");
  return { ok: true };
}

export async function saveAvailability(input: {
  rules: { weekday: number; startMin: number; endMin: number; active: boolean }[];
}): Promise<ActionResult & { created?: number }> {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" || !user.interviewerProfileId) {
    return { error: "Switch to an interviewer account to edit availability." };
  }

  const invalid = input.rules.find((r) => r.active && r.endMin - r.startMin < 30);
  if (invalid) return { error: "Each window needs to be at least 30 minutes long." };

  const overlapping = input.rules.find((rule, index) => {
    if (!rule.active) return false;
    return input.rules.some((other, otherIndex) => {
      if (otherIndex <= index || other.weekday !== rule.weekday || !other.active) return false;
      return rule.startMin < other.endMin && other.startMin < rule.endMin;
    });
  });
  if (overlapping) return { error: "Two windows on the same day overlap. Merge them into one." };

  await prisma.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({ where: { interviewerId: user.interviewerProfileId! } });

    const activeRules = input.rules.filter((r) => r.active);
    if (activeRules.length) {
      await tx.availabilityRule.createMany({
        data: activeRules.map((r) => ({
          interviewerId: user.interviewerProfileId!,
          weekday: r.weekday,
          startMin: r.startMin,
          endMin: r.endMin,
          active: true,
        })),
      });
    }
  });

  const result = await regenerateSlots(user.interviewerProfileId);
  revalidatePath("/interviewer/availability");
  revalidatePath("/interviewer/schedule");
  revalidatePath("/student/book");
  return { ok: true, created: result.created };
}

export async function addTimeOff(formData: FormData) {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" || !user.interviewerProfileId) return;

  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "Time off");
  if (!date) return;

  await prisma.availabilityException.create({
    data: {
      interviewerId: user.interviewerProfileId,
      date,
      type: "UNAVAILABLE",
      note,
    },
  });

  // Cancel affected bookings without consuming an attempt.
  const dayStart = new Date(`${date}T00:00:00+05:30`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const affected = await prisma.interview.findMany({
    where: {
      interviewerId: user.id,
      status: { in: ["BOOKED", "AWAITING_OUTCOME"] },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
    include: { badge: { include: { track: true } }, student: { include: { user: true } } },
  });

  for (const interview of affected) {
    await prisma.$transaction(async (tx) => {
      await tx.interview.update({
        where: { id: interview.id },
        data: {
          status: "CANCELLED_INTERVIEWER",
          cancelledAt: new Date(),
          cancelledBy: "INTERVIEWER",
          cancelReason: `Interviewer unavailable: ${note}`,
        },
      });
      await tx.slotLock.deleteMany({ where: { interviewId: interview.id } });
      await tx.interviewSlot.update({ where: { id: interview.slotId }, data: { status: "BLOCKED" } });
      await tx.badgeProgress.update({
        where: { studentId_badgeId: { studentId: interview.studentId, badgeId: interview.badgeId } },
        data: { status: "ELIGIBLE" },
      });
      await tx.interviewEvent.create({
        data: {
          interviewId: interview.id,
          fromState: "BOOKED",
          toState: "CANCELLED_INTERVIEWER",
          actorId: user.id,
          actorRole: "INTERVIEWER",
          reason: `Time off added for ${date}`,
        },
      });
      await tx.notification.create({
        data: {
          userId: interview.student.userId,
          interviewId: interview.id,
          templateKey: "CANCELLED_INTERVIEWER",
          title: "Your interviewer had to cancel",
          body: `We're sorry — your ${interview.badge.track.name} · ${interview.badge.name} interview on ${date} has been cancelled because your interviewer is unavailable.\n\nNo attempt was used. You get priority rebooking for the next 48 hours, and the earlier slot has been released back into the pool.`,
          ctaLabel: "Rebook now",
          ctaHref: "/student/book",
        },
      });
    });
  }

  await regenerateSlots(user.interviewerProfileId);
  revalidatePath("/interviewer/availability");
  revalidatePath("/interviewer/schedule");
  revalidatePath("/student");
}

export async function seedExtraDays(days: number): Promise<ActionResult & { created?: number }> {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" || !user.interviewerProfileId) return { error: "Not an interviewer." };
  const result = await regenerateSlots(user.interviewerProfileId, days);
  revalidatePath("/interviewer/availability");
  return { ok: true, created: result.created };
}

export async function removeTimeOffForm(formData: FormData) {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" || !user.interviewerProfileId) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.availabilityException.delete({ where: { id } });
  await regenerateSlots(user.interviewerProfileId);
  revalidatePath("/interviewer/availability");
  revalidatePath("/interviewer/schedule");
}
