import { prisma } from "./prisma";
import { addDaysKey, istDateKey, istToUtc } from "./time";
import { BOOKING_WINDOW_DAYS } from "./state-machine";

/**
 * Materialise OPEN slots for an interviewer from their weekly rules +
 * date exceptions. Booked/blocked slots are never touched: availability
 * edits only ever regenerate unbooked future inventory.
 */
export async function regenerateSlots(interviewerId: string, days = BOOKING_WINDOW_DAYS + 1) {
  const profile = await prisma.interviewerProfile.findUnique({
    where: { id: interviewerId },
    include: { rules: true, exceptions: true },
  });
  if (!profile) return { created: 0 };

  const now = new Date();
  const todayKey = istDateKey(now);

  const existing = await prisma.interviewSlot.findMany({
    where: { interviewerId, startsAt: { gte: now } },
    include: { lock: true },
  });

  const lockedIds = existing.filter((s) => s.lock).map((s) => s.id);
  const takenStarts = new Set(
    existing.filter((s) => s.status !== "OPEN" || s.lock).map((s) => s.startsAt.getTime()),
  );

  const staleOpen = existing.filter((s) => s.status === "OPEN" && !s.lock).map((s) => s.id);
  if (staleOpen.length) {
    await prisma.interviewSlot.deleteMany({ where: { id: { in: staleOpen } } });
  }

  const activeRules = profile.rules.filter((r) => r.active);
  const slotMs = profile.slotMinutes;
  const step = profile.slotMinutes + profile.bufferMinutes;

  const toCreate: {
    interviewerId: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    sourceRuleId: string;
  }[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const dateKey = addDaysKey(todayKey, dayOffset);
    const [y, m, d] = dateKey.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    let windows = activeRules
      .filter((r) => r.weekday === weekday)
      .map((r) => ({ start: r.startMin, end: r.endMin, ruleId: r.id }));

    const dayExceptions = profile.exceptions.filter((e) => e.date === dateKey);
    for (const ex of dayExceptions) {
      if (ex.type === "UNAVAILABLE") {
        windows = windows.filter((w) => {
          if (ex.startMin == null || ex.endMin == null) return false;
          return w.end <= ex.startMin || w.start >= ex.endMin;
        });
      }
    }
    for (const ex of dayExceptions) {
      if (ex.type === "EXTRA" && ex.startMin != null && ex.endMin != null) {
        windows.push({ start: ex.startMin, end: ex.endMin, ruleId: `exception:${ex.id}` });
      }
    }

    let perDay = existing.filter(
      (s) => s.startsAt >= istToUtc(dateKey, 0) && s.startsAt < istToUtc(dateKey, 1440),
    ).length;

    for (const w of windows) {
      for (let t = w.start; t + slotMs <= w.end; t += step) {
        if (perDay >= profile.maxPerDay) break;
        const startsAt = istToUtc(dateKey, t);
        if (startsAt.getTime() <= now.getTime() + 60 * 60 * 1000) continue;
        if (takenStarts.has(startsAt.getTime())) continue;
        toCreate.push({
          interviewerId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + slotMs * 60_000),
          status: "OPEN",
          sourceRuleId: w.ruleId,
        });
        takenStarts.add(startsAt.getTime());
        perDay++;
      }
    }
  }

  if (toCreate.length) {
    await prisma.interviewSlot.createMany({ data: toCreate });
  }

  return { created: toCreate.length, kept: lockedIds.length };
}

/** Slots a student may actually book: open, beyond the 24h cutoff, inside the window. */
export async function getBookableSlots() {
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return prisma.interviewSlot.findMany({
    where: {
      status: "OPEN",
      lock: { is: null },
      startsAt: { gte: cutoff },
    },
    include: { interviewer: { include: { user: true } } },
    orderBy: { startsAt: "asc" },
  });
}
