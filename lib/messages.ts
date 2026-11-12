import { formatIstDayLong, formatIstTimeRange } from "./time";

export type MessageCopy = {
  templateKey: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type BookingContext = {
  studentName: string;
  trackName: string;
  badgeName: string;
  interviewerName: string;
  startsAt: Date;
  endsAt: Date;
  meetingUrl: string;
  interviewId: string;
};

/**
 * The three messages a student sees in this flow, written exactly as delivered.
 * 1. Booking confirmed
 * 2. 24-hour reminder
 * 3. Result (pass / fail / retake variants)
 */
export function bookingConfirmed(ctx: BookingContext): MessageCopy {
  return {
    templateKey: "BOOKING_CONFIRMED",
    title: `Interview booked — ${ctx.trackName} · ${ctx.badgeName}`,
    body: `Hi ${ctx.studentName}, your Level Clearance Interview is confirmed.

${formatIstDayLong(ctx.startsAt)} · ${formatIstTimeRange(ctx.startsAt, ctx.endsAt)} IST
Interviewer: ${ctx.interviewerName}
Google Meet: ${ctx.meetingUrl}

Join 5 minutes early with your student ID ready. You can reschedule or cancel up to 24 hours before your slot.`,
    ctaLabel: "View interview",
    ctaHref: `/student/interviews/${ctx.interviewId}`,
  };
}

export function reminder24h(ctx: BookingContext): MessageCopy {
  return {
    templateKey: "REMINDER_24H",
    title: `Your interview is tomorrow, ${formatIstTimeRange(ctx.startsAt, ctx.endsAt)} IST`,
    body: `Quick reminder for your Level Clearance Interview.

${ctx.trackName} · ${ctx.badgeName}
${formatIstDayLong(ctx.startsAt)} · ${formatIstTimeRange(ctx.startsAt, ctx.endsAt)} IST
Interviewer: ${ctx.interviewerName}
Google Meet: ${ctx.meetingUrl}

Have your screen share ready and be online 5 minutes early. Running late? Mark it from your dashboard so your interviewer knows.`,
    ctaLabel: "Open interview",
    ctaHref: `/student/interviews/${ctx.interviewId}`,
  };
}

type ResultContext = {
  studentName: string;
  trackName: string;
  badgeName: string;
  interviewerName: string;
  note?: string | null;
  attemptNo: number;
  maxAttempts: number;
  credentialId?: string | null;
  milesAward?: number;
  retakeDate?: Date | null;
  interviewId: string;
};

export function resultPass(ctx: ResultContext): MessageCopy {
  return {
    templateKey: "RESULT_PASS",
    title: `You cleared it — ${ctx.badgeName} Badge unlocked 🎉`,
    body: `Congratulations, ${ctx.studentName}. You passed your Level Clearance Interview for ${ctx.trackName} · ${ctx.badgeName}.

+${ctx.milesAward ?? 250} Miles credited
Badge added to your profile
Qualiflyer status unlocked

Your credential ID is ${ctx.credentialId ?? "GRIT-PENDING"}. Share it on your profile — your next badge is already waiting.`,
    ctaLabel: "See your badge",
    ctaHref: "/student",
  };
}

export function resultFail(ctx: ResultContext): MessageCopy {
  const dateLabel = ctx.retakeDate
    ? formatIstDayLong(ctx.retakeDate)
    : "the date shown on your dashboard";
  return {
    templateKey: "RESULT_FAIL",
    title: "Interview result: not cleared this time",
    body: `Hi ${ctx.studentName}, you didn't clear the ${ctx.badgeName} Level Clearance Interview for ${ctx.trackName}.

${ctx.note ? `Feedback from ${ctx.interviewerName}: “${ctx.note}”\n\n` : ""}You can book a retake from ${dateLabel} (attempt ${Math.min(ctx.attemptNo + 1, ctx.maxAttempts)} of ${ctx.maxAttempts}). Use the time before then on the skill your interviewer flagged — it's the one that will move the needle.`,
    ctaLabel: "View feedback",
    ctaHref: "/student",
  };
}

export function resultRetake(ctx: ResultContext): MessageCopy {
  const dateLabel = ctx.retakeDate
    ? formatIstDayLong(ctx.retakeDate)
    : "the date shown on your dashboard";
  return {
    templateKey: "RESULT_RETAKE",
    title: `Retake recommended — available from ${dateLabel}`,
    body: `Your interviewer has asked for a retake rather than a fail. That's a good sign — you're close.

${ctx.trackName} · ${ctx.badgeName}
Available to rebook: ${dateLabel}
Attempt ${Math.min(ctx.attemptNo + 1, ctx.maxAttempts)} of ${ctx.maxAttempts}

${ctx.note ? `Focus area: ${ctx.note}\n\n` : ""}Book as soon as the window opens — slots for that week go live 7 days ahead.`,
    ctaLabel: "See your status",
    ctaHref: "/student",
  };
}

export function resultMessage(outcome: string, ctx: ResultContext): MessageCopy {
  if (outcome === "PASS") return resultPass(ctx);
  if (outcome === "RETAKE") return resultRetake(ctx);
  return resultFail(ctx);
}

export function nudgeMessage(studentName: string, trackName: string, badgeName: string): MessageCopy {
  return {
    templateKey: "NUDGE",
    title: "Your interview slot is waiting",
    body: `Hi ${studentName}, you've cleared every skill for ${trackName} · ${badgeName} — the last step is your Level Clearance Interview.

Slots are open for the next 14 days. Students who book within 3 days of becoming eligible are 2× more likely to clear on the first attempt.`,
    ctaLabel: "Book a slot",
    ctaHref: "/student/book",
  };
}

export function revokedMessage(studentName: string, badgeName: string, trackName: string, reason: string): MessageCopy {
  return {
    templateKey: "FLAG_REVOKED",
    title: `Your ${badgeName} Badge has been nullified`,
    body: `Hi ${studentName}, following a malpractice review, your ${trackName} · ${badgeName} Badge has been nullified and the ${250} Miles awarded with it have been reversed.

Reason recorded by Interview Ops: ${reason}

If you believe this is a mistake, you can appeal within 7 days from your dashboard. Your interview recording and notes are attached to the case.`,
    ctaLabel: "Appeal this decision",
    ctaHref: "/student",
  };
}
