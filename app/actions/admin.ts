"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { nudgeMessage, revokedMessage } from "@/lib/messages";

type ActionResult = { ok: true } | { error: string };

export async function nudgeStudent(studentProfileId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return { error: "Interview Ops only." };

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      user: true,
      progress: { include: { badge: { include: { track: true } } } },
    },
  });
  if (!student) return { error: "Student not found." };
  const progress = student.progress[0];
  if (!progress) return { error: "Student has no badge progress." };

  const copy = nudgeMessage(student.user.name, progress.badge.track.name, progress.badge.name);

  await prisma.$transaction(async (tx) => {
    await tx.opsNudge.create({
      data: {
        studentId: studentProfileId,
        sentBy: user.id,
        channel: "IN_APP",
        note: "Eligible but not booked",
      },
    });
    await tx.notification.create({
      data: {
        userId: student.userId,
        templateKey: copy.templateKey,
        title: copy.title,
        body: copy.body,
        ctaLabel: copy.ctaLabel,
        ctaHref: copy.ctaHref,
      },
    });
  });

  revalidatePath("/admin/students");
  return { ok: true };
}

export async function flagMalpractice(input: {
  studentProfileId: string;
  reason: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return { error: "Interview Ops only." };
  if (!input.reason.trim()) return { error: "Add a reason — it goes on the student's record and in their message." };

  const student = await prisma.studentProfile.findUnique({
    where: { id: input.studentProfileId },
    include: {
      user: true,
      progress: { include: { badge: { include: { track: true } } } },
      interviews: { orderBy: { startsAt: "desc" } },
    },
  });
  if (!student) return { error: "Student not found." };
  const progress = student.progress[0];
  if (!progress) return { error: "No badge to revoke." };
  if (progress.status === "REVOKED") return { error: "This badge is already revoked." };

  const interview = student.interviews.find((i) => i.status === "PASSED") ?? student.interviews[0] ?? null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.malpracticeFlag.create({
      data: {
        studentId: student.id,
        badgeId: progress.badgeId,
        interviewId: interview?.id ?? null,
        raisedBy: user.id,
        reason: input.reason.trim(),
        status: "CONFIRMED",
        resolvedAt: now,
      },
    });

    await tx.badgeProgress.update({
      where: { id: progress.id },
      data: { status: "REVOKED", revokedAt: now, credentialId: null },
    });

    await tx.studentProfile.update({
      where: { id: student.id },
      data: {
        miles: Math.max(0, student.miles - progress.badge.milesAward),
        qualiflyerAt: null,
      },
    });

    if (interview) {
      await tx.interviewEvent.create({
        data: {
          interviewId: interview.id,
          fromState: interview.status,
          toState: "REVOKED",
          actorId: user.id,
          actorRole: "ADMIN",
          reason: `Malpractice confirmed: ${input.reason.trim()}`,
        },
      });
    }

    const copy = revokedMessage(
      student.user.name,
      progress.badge.name,
      progress.badge.track.name,
      input.reason.trim(),
    );
    await tx.notification.create({
      data: {
        userId: student.userId,
        interviewId: interview?.id ?? null,
        templateKey: copy.templateKey,
        title: copy.title,
        body: copy.body,
        ctaLabel: copy.ctaLabel,
        ctaHref: copy.ctaHref,
      },
    });
  });

  revalidatePath("/admin/students");
  revalidatePath("/admin/flags");
  revalidatePath("/student");
  return { ok: true };
}

export async function dismissFlag(formData: FormData) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.malpracticeFlag.update({
    where: { id },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  revalidatePath("/admin/flags");
}
