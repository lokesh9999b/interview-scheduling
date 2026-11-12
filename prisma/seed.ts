import { PrismaClient } from "@prisma/client";
import { addDaysKey, istDateKey, istToUtc, nowPlusMinutes, roundToStep, utcToIstMinutes } from "../lib/time";
import { regenerateSlots } from "../lib/slots";
import { bookingConfirmed, reminder24h, resultMessage, revokedMessage, nudgeMessage } from "../lib/messages";

const prisma = new PrismaClient();

const TODAY = istDateKey();
const NOW = new Date();

function at(dayOffset: number, minutes: number) {
  return istToUtc(addDaysKey(TODAY, dayOffset), minutes);
}

function upcomingToday() {
  const candidate = roundToStep(nowPlusMinutes(90), 15);
  const mins = utcToIstMinutes(candidate);
  if (mins < 9 * 60 || mins > 19 * 60) return at(1, 11 * 60);
  return candidate;
}

function recentlyFinished() {
  return roundToStep(nowPlusMinutes(-45), 15);
}

const SKILLS = [
  "Computational Thinking · L1",
  "CS Fundamentals · L1",
  "Applied Gen AI Development · L1",
  "UI Engineering · L2",
];

async function main() {
  console.log("Seeding GRIT interview demo…");

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.interviewEvent.deleteMany(),
    prisma.malpracticeFlag.deleteMany(),
    prisma.opsNudge.deleteMany(),
    prisma.slotLock.deleteMany(),
    prisma.interview.deleteMany(),
    prisma.interviewSlot.deleteMany(),
    prisma.availabilityException.deleteMany(),
    prisma.availabilityRule.deleteMany(),
    prisma.badgeProgress.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.interviewerProfile.deleteMany(),
    prisma.badge.deleteMany(),
    prisma.track.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const apm = await prisma.track.create({
    data: {
      id: "track_apm",
      name: "AI Product Mastery",
      slug: "ai-product-mastery",
      description: "Ship AI products end to end: problem framing, UI engineering, and applied Gen AI.",
    },
  });

  const asm = await prisma.track.create({
    data: {
      id: "track_asm",
      name: "AI Systems Mastery",
      slug: "ai-systems-mastery",
      description: "Build and operate AI systems at scale, from data pipelines to inference.",
    },
  });

  const novice = await prisma.badge.create({
    data: {
      id: "badge_apm_novice",
      trackId: apm.id,
      level: "NOVICE",
      name: "Novice",
      requiredSkills: JSON.stringify(SKILLS),
      milesAward: 250,
      cooldownFailDays: 14,
      cooldownRetakeDays: 7,
      maxAttempts: 3,
    },
  });

  await prisma.badge.create({
    data: {
      id: "badge_apm_specialist",
      trackId: apm.id,
      level: "SPECIALIST",
      name: "Specialist",
      requiredSkills: JSON.stringify([...SKILLS, "System Design · L1", "Server Side Engineering · L2"]),
      milesAward: 500,
      cooldownFailDays: 14,
      cooldownRetakeDays: 7,
      maxAttempts: 3,
    },
  });

  await prisma.badge.create({
    data: {
      id: "badge_asm_novice",
      trackId: asm.id,
      level: "NOVICE",
      name: "Novice",
      requiredSkills: JSON.stringify(["CS Fundamentals · L1", "SQL · L1", "DS & ML · L1", "Critical Thinking · L1"]),
      milesAward: 250,
      cooldownFailDays: 14,
      cooldownRetakeDays: 7,
      maxAttempts: 3,
    },
  });

  const rohan = await prisma.user.create({
    data: {
      id: "usr_rohan_mehta",
      name: "Rohan Mehta",
      email: "rohan.mehta@niatindia.com",
      role: "INTERVIEWER",
      campus: "NIAT Bengaluru",
      hue: 96,
      interviewerProfile: {
        create: {
          id: "ip_rohan",
          title: "Senior Interviewer · AI Product",
          meetingBaseUrl: "https://meet.google.com/grit-rohan",
          slotMinutes: 30,
          bufferMinutes: 5,
          maxPerDay: 8,
        },
      },
    },
    include: { interviewerProfile: true },
  });

  const priya = await prisma.user.create({
    data: {
      id: "usr_priya_nair",
      name: "Priya Nair",
      email: "priya.nair@niatindia.com",
      role: "INTERVIEWER",
      campus: "NIAT Kochi",
      hue: 168,
      interviewerProfile: {
        create: {
          id: "ip_priya",
          title: "Interviewer · AI Systems",
          meetingBaseUrl: "https://meet.google.com/grit-priya",
          slotMinutes: 30,
          bufferMinutes: 5,
          maxPerDay: 7,
        },
      },
    },
    include: { interviewerProfile: true },
  });

  const vikram = await prisma.user.create({
    data: {
      id: "usr_vikram_shah",
      name: "Vikram Shah",
      email: "vikram.shah@niatindia.com",
      role: "INTERVIEWER",
      campus: "NIAT Pune",
      hue: 42,
      interviewerProfile: {
        create: {
          id: "ip_vikram",
          title: "Interviewer · AI Product",
          meetingBaseUrl: "https://meet.google.com/grit-vikram",
          slotMinutes: 30,
          bufferMinutes: 5,
          maxPerDay: 6,
        },
      },
    },
    include: { interviewerProfile: true },
  });

  const admin = await prisma.user.create({
    data: {
      id: "usr_ananya",
      name: "Ananya Deshpande",
      email: "ananya.deshpande@niatindia.com",
      role: "ADMIN",
      campus: "NIAT Bengaluru",
      hue: 210,
    },
  });

  type StudentSeed = {
    id: string;
    name: string;
    email: string;
    campus: string;
    hue: number;
    attendance: number;
    skills: number;
    status: string;
    miles?: number;
    attempts?: number;
    cooldownDays?: number;
    registration?: string;
    conduct?: string;
    awardedAt?: Date;
    credentialId?: string;
  };

  const students: StudentSeed[] = [
    { id: "usr_aarav", name: "Aarav Sharma", email: "aarav.sharma@niatindia.com", campus: "NIAT Bengaluru", hue: 140, attendance: 94, skills: 4, status: "ELIGIBLE" },
    { id: "usr_meera", name: "Meera Iyer", email: "meera.iyer@niatindia.com", campus: "NIAT Kochi", hue: 320, attendance: 91, skills: 4, status: "BOOKED" },
    { id: "usr_rohan_v", name: "Rohan Verma", email: "rohan.verma@niatindia.com", campus: "NIAT Pune", hue: 190, attendance: 88, skills: 4, status: "AWAITING_OUTCOME", attempts: 1 },
    { id: "usr_sana", name: "Sana Khan", email: "sana.khan@niatindia.com", campus: "NIAT Bengaluru", hue: 275, attendance: 96, skills: 4, status: "PASSED", miles: 250, attempts: 1, awardedAt: at(-2, 12 * 60), credentialId: "GRIT-APM-NOV-2026-0142" },
    { id: "usr_kabir", name: "Kabir Nair", email: "kabir.nair@niatindia.com", campus: "NIAT Kochi", hue: 15, attendance: 84, skills: 4, status: "FAILED", attempts: 1, cooldownDays: 11 },
    { id: "usr_diya", name: "Diya Patel", email: "diya.patel@niatindia.com", campus: "NIAT Pune", hue: 350, attendance: 90, skills: 4, status: "RETAKE_REQUIRED", attempts: 1, cooldownDays: 5 },
    { id: "usr_arjun", name: "Arjun Reddy", email: "arjun.reddy@niatindia.com", campus: "NIAT Bengaluru", hue: 230, attendance: 79, skills: 4, status: "NO_SHOW", attempts: 1, cooldownDays: 6 },
    { id: "usr_ishita", name: "Ishita Bose", email: "ishita.bose@niatindia.com", campus: "NIAT Kochi", hue: 305, attendance: 93, skills: 3, status: "IN_PROGRESS" },
    { id: "usr_tanvi", name: "Tanvi Rao", email: "tanvi.rao@niatindia.com", campus: "NIAT Pune", hue: 60, attendance: 68, skills: 4, status: "INELIGIBLE", registration: "PENDING" },
    { id: "usr_nikhil", name: "Nikhil Menon", email: "nikhil.menon@niatindia.com", campus: "NIAT Bengaluru", hue: 20, attendance: 87, skills: 4, status: "REVOKED", attempts: 1, miles: 0, awardedAt: at(-10, 12 * 60), credentialId: "GRIT-APM-NOV-2026-0087" },
  ];

  const profiles = new Map<string, { studentProfileId: string; progressId: string }>();

  for (const s of students) {
    const user = await prisma.user.create({
      data: {
        id: s.id,
        name: s.name,
        email: s.email,
        role: "STUDENT",
        campus: s.campus,
        cohort: "2024",
        hue: s.hue,
        studentProfile: {
          create: {
            attendancePct: s.attendance,
            registrationStatus: s.registration ?? "CLEARED",
            conductStatus: s.conduct ?? "CLEAR",
            miles: s.miles ?? 0,
            qualiflyerAt: s.status === "PASSED" ? s.awardedAt : null,
          },
        },
      },
      include: { studentProfile: true },
    });

    const progress = await prisma.badgeProgress.create({
      data: {
        studentId: user.studentProfile!.id,
        badgeId: novice.id,
        skillsCleared: s.skills,
        skillsTotal: SKILLS.length,
        status: s.status,
        attemptsUsed: s.attempts ?? 0,
        cooldownUntil: s.cooldownDays ? nowPlusMinutes(s.cooldownDays * 24 * 60) : null,
        eligibleAt: s.skills === 4 ? at(-4, 10 * 60) : null,
        awardedAt: s.awardedAt ?? null,
        revokedAt: s.status === "REVOKED" ? at(-3, 11 * 60) : null,
        credentialId: s.credentialId ?? null,
      },
    });

    profiles.set(s.id, { studentProfileId: user.studentProfile!.id, progressId: progress.id });
  }

  // Weekly availability (IST minutes from midnight)
  const rules = [
    { interviewerId: rohan.interviewerProfile!.id, weekday: 1, startMin: 600, endMin: 780 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 2, startMin: 600, endMin: 780 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 3, startMin: 600, endMin: 780 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 4, startMin: 600, endMin: 780 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 5, startMin: 600, endMin: 780 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 1, startMin: 900, endMin: 1110 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 2, startMin: 900, endMin: 1110 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 3, startMin: 900, endMin: 1110 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 4, startMin: 900, endMin: 1110 },
    { interviewerId: rohan.interviewerProfile!.id, weekday: 5, startMin: 900, endMin: 1110 },
    { interviewerId: priya.interviewerProfile!.id, weekday: 1, startMin: 660, endMin: 840 },
    { interviewerId: priya.interviewerProfile!.id, weekday: 2, startMin: 660, endMin: 840 },
    { interviewerId: priya.interviewerProfile!.id, weekday: 3, startMin: 660, endMin: 840 },
    { interviewerId: priya.interviewerProfile!.id, weekday: 4, startMin: 660, endMin: 840 },
    { interviewerId: priya.interviewerProfile!.id, weekday: 5, startMin: 660, endMin: 840 },
    { interviewerId: priya.interviewerProfile!.id, weekday: 6, startMin: 660, endMin: 840 },
    { interviewerId: vikram.interviewerProfile!.id, weekday: 2, startMin: 960, endMin: 1140 },
    { interviewerId: vikram.interviewerProfile!.id, weekday: 3, startMin: 960, endMin: 1140 },
    { interviewerId: vikram.interviewerProfile!.id, weekday: 4, startMin: 960, endMin: 1140 },
    { interviewerId: vikram.interviewerProfile!.id, weekday: 5, startMin: 960, endMin: 1140 },
    { interviewerId: vikram.interviewerProfile!.id, weekday: 6, startMin: 960, endMin: 1140 },
  ];
  await prisma.availabilityRule.createMany({ data: rules });

  await prisma.availabilityException.create({
    data: {
      interviewerId: rohan.interviewerProfile!.id,
      date: addDaysKey(TODAY, 3),
      type: "UNAVAILABLE",
      note: "Faculty review day",
    },
  });

  type InterviewSeed = {
    studentId: string;
    interviewerUserId: string;
    interviewerProfileId: string;
    startsAt: Date;
    status: string;
    attemptNo?: number;
    outcome?: string;
    outcomeNote?: string;
    outcomeAt?: Date;
    noShowAt?: Date;
    cancelReason?: string;
    notify?: boolean;
  };

  const interviews: InterviewSeed[] = [
    {
      studentId: "usr_meera",
      interviewerUserId: rohan.id,
      interviewerProfileId: rohan.interviewerProfile!.id,
      startsAt: upcomingToday(),
      status: "BOOKED",
      notify: true,
    },
    {
      studentId: "usr_rohan_v",
      interviewerUserId: priya.id,
      interviewerProfileId: priya.interviewerProfile!.id,
      startsAt: recentlyFinished(),
      status: "AWAITING_OUTCOME",
      attemptNo: 1,
      notify: true,
    },
    {
      studentId: "usr_sana",
      interviewerUserId: vikram.id,
      interviewerProfileId: vikram.interviewerProfile!.id,
      startsAt: at(-2, 11 * 60),
      status: "PASSED",
      attemptNo: 1,
      outcome: "PASS",
      outcomeNote: "Clear, structured thinking. Shipped a working prototype and explained the tradeoffs.",
      outcomeAt: at(-2, 12 * 60),
      notify: true,
    },
    {
      studentId: "usr_kabir",
      interviewerUserId: rohan.id,
      interviewerProfileId: rohan.interviewerProfile!.id,
      startsAt: at(-3, 16 * 60),
      status: "FAILED",
      attemptNo: 1,
      outcome: "FAIL",
      outcomeNote: "Strong on UI engineering, but system design fundamentals need work. Could not justify data model choices.",
      outcomeAt: at(-3, 16 * 60 + 35),
      notify: true,
    },
    {
      studentId: "usr_diya",
      interviewerUserId: priya.id,
      interviewerProfileId: priya.interviewerProfile!.id,
      startsAt: at(-4, 11 * 60 + 30),
      status: "RETAKE_REQUIRED",
      attemptNo: 1,
      outcome: "RETAKE",
      outcomeNote: "Close. The build worked, but the explanation of retrieval evaluation was thin. Retake after revising DS & ML L1.",
      outcomeAt: at(-4, 12 * 60 + 5),
      notify: true,
    },
    {
      studentId: "usr_arjun",
      interviewerUserId: rohan.id,
      interviewerProfileId: rohan.interviewerProfile!.id,
      startsAt: at(-5, 16 * 60),
      status: "NO_SHOW",
      attemptNo: 1,
      noShowAt: at(-5, 16 * 60 + 12),
      notify: false,
    },
    {
      studentId: "usr_nikhil",
      interviewerUserId: vikram.id,
      interviewerProfileId: vikram.interviewerProfile!.id,
      startsAt: at(-10, 12 * 60),
      status: "PASSED",
      attemptNo: 1,
      outcome: "PASS",
      outcomeNote: "Passed on the day.",
      outcomeAt: at(-10, 12 * 60 + 30),
      notify: true,
    },
  ];

  for (const seed of interviews) {
    const slot = await prisma.interviewSlot.create({
      data: {
        interviewerId: seed.interviewerProfileId,
        startsAt: seed.startsAt,
        endsAt: new Date(seed.startsAt.getTime() + 30 * 60_000),
        status: "BOOKED",
      },
    });

    const profile = profiles.get(seed.studentId)!;
    const student = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: profile.studentProfileId },
      include: { user: true },
    });
    const interviewer = await prisma.user.findUniqueOrThrow({ where: { id: seed.interviewerUserId } });
    const badge = novice;
    const attemptNo = seed.attemptNo ?? 1;

    const interview = await prisma.interview.create({
      data: {
        studentId: profile.studentProfileId,
        badgeId: badge.id,
        slotId: slot.id,
        interviewerId: seed.interviewerUserId,
        attemptNo,
        status: seed.status,
        startsAt: seed.startsAt,
        endsAt: new Date(seed.startsAt.getTime() + 30 * 60_000),
        meetingUrl: `https://meet.google.com/grit-${seed.studentId.replace("usr_", "")}`,
        outcome: seed.outcome ?? null,
        outcomeNote: seed.outcomeNote ?? null,
        outcomeAt: seed.outcomeAt ?? null,
        outcomeBy: seed.outcome ? seed.interviewerUserId : null,
        noShowAt: seed.noShowAt ?? null,
        cancelReason: seed.cancelReason ?? null,
        bookedAt: new Date(seed.startsAt.getTime() - 2 * 86_400_000),
      },
    });

    if (seed.status === "BOOKED" || seed.status === "AWAITING_OUTCOME") {
      await prisma.slotLock.create({ data: { slotId: slot.id, interviewId: interview.id } });
    }

    await prisma.interviewEvent.create({
      data: {
        interviewId: interview.id,
        fromState: "ELIGIBLE",
        toState: seed.status,
        actorId: seed.studentId,
        actorRole: "STUDENT",
        reason: seed.outcomeNote ?? null,
        createdAt: seed.outcomeAt ?? seed.startsAt,
      },
    });

    if (seed.notify) {
      const ctx = {
        studentName: student.user.name,
        trackName: apm.name,
        badgeName: badge.name,
        interviewerName: interviewer.name,
        startsAt: seed.startsAt,
        endsAt: new Date(seed.startsAt.getTime() + 30 * 60_000),
        meetingUrl: interview.meetingUrl,
        interviewId: interview.id,
      };

      const confirmed = bookingConfirmed(ctx);
      await prisma.notification.create({
        data: {
          userId: student.userId,
          interviewId: interview.id,
          templateKey: confirmed.templateKey,
          title: confirmed.title,
          body: confirmed.body,
          ctaLabel: confirmed.ctaLabel,
          ctaHref: confirmed.ctaHref,
          sentAt: new Date(seed.startsAt.getTime() - 2 * 86_400_000),
          readAt: new Date(seed.startsAt.getTime() - 2 * 86_400_000 + 60_000),
        },
      });

      if (seed.status === "BOOKED") {
        const reminder = reminder24h(ctx);
        await prisma.notification.create({
          data: {
            userId: student.userId,
            interviewId: interview.id,
            templateKey: reminder.templateKey,
            title: reminder.title,
            body: reminder.body,
            ctaLabel: reminder.ctaLabel,
            ctaHref: reminder.ctaHref,
            sentAt: new Date(seed.startsAt.getTime() - 24 * 60 * 60_000),
          },
        });
      }

      if (seed.outcome) {
        const result = resultMessage(seed.outcome, {
          studentName: student.user.name,
          trackName: apm.name,
          badgeName: badge.name,
          interviewerName: interviewer.name,
          note: seed.outcomeNote,
          attemptNo,
          maxAttempts: badge.maxAttempts,
          credentialId: seed.studentId === "usr_sana" ? "GRIT-APM-NOV-2026-0142" : "GRIT-APM-NOV-2026-0087",
          milesAward: badge.milesAward,
          retakeDate: seed.outcome === "PASS" ? null : nowPlusMinutes((seed.outcome === "FAIL" ? 11 : 5) * 86_400_000),
          interviewId: interview.id,
        });
        await prisma.notification.create({
          data: {
            userId: student.userId,
            interviewId: interview.id,
            templateKey: result.templateKey,
            title: result.title,
            body: result.body,
            ctaLabel: result.ctaLabel,
            ctaHref: result.ctaHref,
            sentAt: seed.outcomeAt ?? new Date(),
          },
        });
      }
    }
  }

  // Malpractice flag that nullified Nikhil's badge after the fact
  const nikhilProfile = profiles.get("usr_nikhil")!;
  const nikhilInterview = await prisma.interview.findFirstOrThrow({
    where: { studentId: nikhilProfile.studentProfileId },
  });

  await prisma.malpracticeFlag.create({
    data: {
      studentId: nikhilProfile.studentProfileId,
      badgeId: novice.id,
      interviewId: nikhilInterview.id,
      raisedBy: admin.id,
      reason: "Post-interview screen recording showed a second person answering questions off-camera.",
      status: "CONFIRMED",
      createdAt: at(-4, 10 * 60),
      resolvedAt: at(-3, 11 * 60),
    },
  });

  await prisma.interviewEvent.create({
    data: {
      interviewId: nikhilInterview.id,
      fromState: "PASSED",
      toState: "REVOKED",
      actorId: admin.id,
      actorRole: "ADMIN",
      reason: "Malpractice confirmed: second person present off-camera.",
      createdAt: at(-3, 11 * 60),
    },
  });

  const nikhilUser = await prisma.user.findUniqueOrThrow({ where: { id: "usr_nikhil" } });
  const revoked = revokedMessage(nikhilUser.name, novice.name, apm.name, "Second person present off-camera during the interview.");
  await prisma.notification.create({
    data: {
      userId: nikhilUser.id,
      interviewId: nikhilInterview.id,
      templateKey: revoked.templateKey,
      title: revoked.title,
      body: revoked.body,
      ctaLabel: revoked.ctaLabel,
      ctaHref: revoked.ctaHref,
      sentAt: at(-3, 11 * 60),
    },
  });

  // Aarav has an unread nudge — he is eligible and hasn't booked
  const aarav = await prisma.user.findUniqueOrThrow({ where: { id: "usr_aarav" } });
  const nudge = nudgeMessage(aarav.name, apm.name, novice.name);
  await prisma.notification.create({
    data: {
      userId: aarav.id,
      templateKey: nudge.templateKey,
      title: nudge.title,
      body: nudge.body,
      ctaLabel: nudge.ctaLabel,
      ctaHref: nudge.ctaHref,
      sentAt: nowPlusMinutes(-180),
    },
  });

  for (const interviewer of [rohan, priya, vikram]) {
    const result = await regenerateSlots(interviewer.interviewerProfile!.id);
    console.log(`  slots for ${interviewer.name}: ${result.created} open`);
  }

  console.log(`Seeded ${students.length} students, 3 interviewers, 1 ops user.`);
  console.log(`Sign in as: aarav.sharma@niatindia.com (student), rohan.mehta@niatindia.com (interviewer), ananya.deshpande@niatindia.com (ops)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
