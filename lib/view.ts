import { prisma } from "./prisma";

export type InterviewView = {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  interviewerName: string;
  meetingUrl: string;
  attemptNo: number;
  rescheduleCount: number;
  outcome: string | null;
  outcomeNote: string | null;
  outcomeAt: Date | null;
  noShowAt: Date | null;
  cancelReason: string | null;
};

export type Snapshot = {
  studentId: string;
  userId: string;
  name: string;
  campus: string | null;
  cohort: string | null;
  hue: number;
  miles: number;
  qualiflyer: boolean;
  attendancePct: number;
  registrationStatus: string;
  conductStatus: string;
  badgeId: string;
  badgeName: string;
  trackName: string;
  level: string;
  skills: string[];
  skillsCleared: number;
  skillsTotal: number;
  status: string;
  attemptsUsed: number;
  maxAttempts: number;
  cooldownUntil: Date | null;
  credentialId: string | null;
  awardedAt: Date | null;
  revokedAt: Date | null;
  activeInterview: InterviewView | null;
  lastInterview: InterviewView | null;
  interviews: InterviewView[];
  events: {
    id: string;
    fromState: string;
    toState: string;
    actorRole: string;
    reason: string | null;
    createdAt: Date;
  }[];
};

function toView(i: {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  meetingUrl: string;
  attemptNo: number;
  outcome: string | null;
  outcomeNote: string | null;
  outcomeAt: Date | null;
  noShowAt: Date | null;
  cancelReason: string | null;
  events: { fromState: string; toState: string }[];
  interviewer: { name: string };
}): InterviewView {
  return {
    id: i.id,
    status: i.status,
    startsAt: i.startsAt,
    endsAt: i.endsAt,
    interviewerName: i.interviewer.name,
    meetingUrl: i.meetingUrl,
    attemptNo: i.attemptNo,
    rescheduleCount: i.events.filter((event) => event.fromState === "BOOKED" && event.toState === "BOOKED").length,
    outcome: i.outcome,
    outcomeNote: i.outcomeNote,
    outcomeAt: i.outcomeAt,
    noShowAt: i.noShowAt,
    cancelReason: i.cancelReason,
  };
}

export async function getSnapshot(studentProfileId: string): Promise<Snapshot> {
  const profile = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentProfileId },
    include: {
      user: true,
      progress: { include: { badge: { include: { track: true } } } },
    },
  });

  const progress = profile.progress[0];
  if (!progress) throw new Error("Student has no badge progress");

  const interviews = await prisma.interview.findMany({
    where: { studentId: profile.id, badgeId: progress.badgeId },
    orderBy: { startsAt: "desc" },
    include: {
      interviewer: true,
      events: {
        where: { fromState: "BOOKED", toState: "BOOKED" },
        select: { fromState: true, toState: true },
      },
    },
  });

  const events = interviews.length
    ? await prisma.interviewEvent.findMany({
        where: { interviewId: { in: interviews.map((i) => i.id) } },
        orderBy: { createdAt: "desc" },
        take: 12,
      })
    : [];

  const views = interviews.map(toView);
  const active = views.find((i) => i.status === "BOOKED" || i.status === "AWAITING_OUTCOME") ?? null;
  const last = views.find((i) => ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(i.status)) ?? null;

  let skills: string[] = [];
  try {
    skills = JSON.parse(progress.badge.requiredSkills);
  } catch {
    skills = [];
  }

  return {
    studentId: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    campus: profile.user.campus,
    cohort: profile.user.cohort,
    hue: profile.user.hue,
    miles: profile.miles,
    qualiflyer: Boolean(profile.qualiflyerAt),
    attendancePct: profile.attendancePct,
    registrationStatus: profile.registrationStatus,
    conductStatus: profile.conductStatus,
    badgeId: progress.badgeId,
    badgeName: progress.badge.name,
    trackName: progress.badge.track.name,
    level: progress.badge.level,
    skills,
    skillsCleared: progress.skillsCleared,
    skillsTotal: progress.skillsTotal,
    status: progress.status,
    attemptsUsed: progress.attemptsUsed,
    maxAttempts: progress.badge.maxAttempts,
    cooldownUntil: progress.cooldownUntil,
    credentialId: progress.credentialId,
    awardedAt: progress.awardedAt,
    revokedAt: progress.revokedAt,
    activeInterview: active,
    lastInterview: last,
    interviews: views,
    events,
  };
}

export async function getSnapshotForUser(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  return getSnapshot(profile.id);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function firstName(name: string) {
  return name.split(" ")[0];
}
