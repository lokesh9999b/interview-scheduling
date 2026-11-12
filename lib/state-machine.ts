export const BOOKING_CUTOFF_HOURS = 24;
export const MAX_RESCHEDULES = 2;
export const SLOT_HOLD_MINUTES = 10;
export const BOOKING_WINDOW_DAYS = 14;

export type InterviewStatus =
  | "BOOKED"
  | "AWAITING_OUTCOME"
  | "PASSED"
  | "FAILED"
  | "RETAKE_REQUIRED"
  | "NO_SHOW"
  | "CANCELLED_STUDENT"
  | "CANCELLED_INTERVIEWER"
  | "EXPIRED";

export type ProgressStatus =
  | "IN_PROGRESS"
  | "ELIGIBLE"
  | "BOOKED"
  | "AWAITING_OUTCOME"
  | "PASSED"
  | "FAILED"
  | "RETAKE_REQUIRED"
  | "NO_SHOW"
  | "REVOKED"
  | "INELIGIBLE";

export const ACTIVE_STATUSES: InterviewStatus[] = ["BOOKED", "AWAITING_OUTCOME"];

export const OUTCOME_TO_STATUS: Record<string, ProgressStatus> = {
  PASS: "PASSED",
  FAIL: "FAILED",
  RETAKE: "RETAKE_REQUIRED",
};

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as InterviewStatus);
}

export type BookabilityInput = {
  progressStatus: string;
  cooldownUntil: Date | null;
  attemptsUsed: number;
  maxAttempts: number;
  hasActiveInterview: boolean;
  attendancePct: number;
  registrationStatus: string;
  conductStatus: string;
  now?: Date;
};

export type Bookability = { ok: true } | { ok: false; code: string; reason: string };

export function canBook(input: BookabilityInput): Bookability {
  const now = input.now ?? new Date();
  if (input.registrationStatus !== "CLEARED")
    return { ok: false, code: "REGISTRATION", reason: "Your semester registration is pending. Clear it with the registrar to unlock booking." };
  if (input.conductStatus !== "CLEAR")
    return { ok: false, code: "CONDUCT", reason: "Your account is under a conduct review. Interview Ops will reach out." };
  if (input.attendancePct < 75)
    return { ok: false, code: "ATTENDANCE", reason: `Attendance is ${input.attendancePct}%. GRIT eligibility needs 75% or above.` };
  if (input.progressStatus === "PASSED")
    return { ok: false, code: "ALREADY_PASSED", reason: "You've already cleared this badge interview." };
  if (input.progressStatus === "REVOKED")
    return { ok: false, code: "REVOKED", reason: "This badge was nullified after a malpractice review. Contact Interview Ops to appeal." };
  if (input.progressStatus === "IN_PROGRESS")
    return { ok: false, code: "SKILLS", reason: "Finish every required skill level before booking the interview." };
  if (input.progressStatus === "INELIGIBLE")
    return { ok: false, code: "INELIGIBLE", reason: "You are not eligible for this badge right now." };
  if (input.hasActiveInterview)
    return { ok: false, code: "ACTIVE_BOOKING", reason: "You already have an interview booked for this badge." };
  if (input.cooldownUntil && input.cooldownUntil > now)
    return {
      ok: false,
      code: "COOLDOWN",
      reason: `Your next attempt unlocks on ${input.cooldownUntil.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}.`,
    };
  if (input.attemptsUsed >= input.maxAttempts)
    return { ok: false, code: "MAX_ATTEMPTS", reason: "You've used all attempts. Interview Ops will review your case manually." };
  return { ok: true };
}

export function cooldownFor(badge: { cooldownFailDays: number; cooldownRetakeDays: number }, outcome: string, from: Date): Date | null {
  if (outcome === "FAIL") return new Date(from.getTime() + badge.cooldownFailDays * 86_400_000);
  if (outcome === "RETAKE") return new Date(from.getTime() + badge.cooldownRetakeDays * 86_400_000);
  return null;
}

export const JOURNEY: { status: ProgressStatus; label: string; tone: string }[] = [
  { status: "IN_PROGRESS", label: "Skills in progress", tone: "muted" },
  { status: "ELIGIBLE", label: "Eligible — book now", tone: "accent" },
  { status: "BOOKED", label: "Interview booked", tone: "info" },
  { status: "AWAITING_OUTCOME", label: "Awaiting outcome", tone: "info" },
  { status: "PASSED", label: "Badge awarded", tone: "success" },
  { status: "FAILED", label: "Not cleared", tone: "danger" },
  { status: "RETAKE_REQUIRED", label: "Retake recommended", tone: "warn" },
  { status: "NO_SHOW", label: "Missed interview", tone: "danger" },
  { status: "REVOKED", label: "Badge nullified", tone: "danger" },
  { status: "INELIGIBLE", label: "Not eligible", tone: "muted" },
];

export function journeyMeta(status: string) {
  return JOURNEY.find((j) => j.status === status) ?? JOURNEY[0];
}

export const INTERVIEW_STATUS_META: Record<string, { label: string; tone: string }> = {
  BOOKED: { label: "Booked", tone: "info" },
  AWAITING_OUTCOME: { label: "Awaiting outcome", tone: "warn" },
  PASSED: { label: "Passed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  RETAKE_REQUIRED: { label: "Retake", tone: "warn" },
  NO_SHOW: { label: "No-show", tone: "danger" },
  CANCELLED_STUDENT: { label: "Cancelled by student", tone: "muted" },
  CANCELLED_INTERVIEWER: { label: "Cancelled by you", tone: "muted" },
  EXPIRED: { label: "Expired", tone: "muted" },
};

export function interviewStatusMeta(status: string) {
  return INTERVIEW_STATUS_META[status] ?? { label: status, tone: "muted" };
}
