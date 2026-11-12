import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  ListChecks,
  Video,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { addDaysKey, formatIstDay, formatIstDayLong, formatIstTime, formatIstTimeRange, istDateKey, istToUtc } from "@/lib/time";
import { interviewStatusMeta } from "@/lib/state-machine";
import { Avatar, Card, Chip, Stat } from "@/components/ui";
import { OutcomeControl } from "@/components/interviewer/OutcomeControl";

export const dynamic = "force-dynamic";

const dateNavFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric" });

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" || !user.interviewerProfileId) redirect(homeForRole(user.role));

  const params = await searchParams;
  const today = istDateKey();
  const dayKey = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;

  const dayStart = istToUtc(dayKey, 0);
  const dayEnd = istToUtc(dayKey, 1440);

  const interviews = await prisma.interview.findMany({
    where: { interviewerId: user.id, startsAt: { gte: dayStart, lt: dayEnd } },
    orderBy: { startsAt: "asc" },
    include: {
      student: { include: { user: true } },
      badge: { include: { track: true } },
    },
  });

  const pending = await prisma.interview.findMany({
    where: { interviewerId: user.id, status: "AWAITING_OUTCOME" },
    orderBy: { startsAt: "asc" },
    include: { student: { include: { user: true } }, badge: { include: { track: true } } },
  });

  const weekStart = istToUtc(addDaysKey(today, -6), 0);
  const weekEnd = istToUtc(addDaysKey(today, 1), 0);
  const week = await prisma.interview.findMany({
    where: { interviewerId: user.id, startsAt: { gte: weekStart, lt: weekEnd } },
  });

  const weekCompleted = week.filter((i) => ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(i.status)).length;
  const weekPassed = week.filter((i) => i.status === "PASSED").length;
  const dayCompleted = interviews.filter((i) => ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(i.status)).length;

  const strip = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(today, i);
    const date = istToUtc(key, 12 * 60);
    const count = key === dayKey ? interviews.length : 0;
    return { key, date, count };
  });

  const upcoming = await prisma.interview.findFirst({
    where: { interviewerId: user.id, status: "BOOKED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { student: { include: { user: true } } },
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Chip tone="accent" dot>
              Interviewer
            </Chip>
            <span className="text-[11px] text-faint">{user.name} · {formatIstDayLong(istToUtc(dayKey, 12 * 60))}</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Your interview day</h1>
          <p className="mt-1 text-xs text-muted">
            {interviews.length} scheduled · {dayCompleted} recorded · {pending.length} waiting on an outcome
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/interviewer/availability" className="btn-ghost btn-sm">
            <CalendarClock size={13} /> Availability
          </Link>
          <Link href="/interviewer/schedule" className="btn-ghost btn-sm">
            <CalendarDays size={13} /> Today
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Scheduled" value={interviews.length} hint="on this date" />
        <Stat label="Recorded" value={dayCompleted} hint="outcomes saved" />
        <Stat label="Pass rate" value={weekCompleted ? `${Math.round((weekPassed / weekCompleted) * 100)}%` : "—"} hint="last 7 days" />
        <Stat label="Open slots" value={week.length ? "—" : "—"} hint="published for 14 days" />
      </div>

      <div className="card flex items-center gap-1 p-2">
        <Link
          href={`/interviewer/schedule?date=${addDaysKey(dayKey, -1)}`}
          className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-fg"
        >
          <ChevronLeft size={16} />
        </Link>
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {strip.map((d) => {
            const active = d.key === dayKey;
            return (
              <Link
                key={d.key}
                href={`/interviewer/schedule?date=${d.key}`}
                className={clsx(
                  "flex min-w-[62px] flex-1 flex-col items-center rounded-lg px-2 py-1.5 text-center transition",
                  active ? "bg-accent/10 text-accent" : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide">{dateNavFmt.format(d.date).split(" ")[0]}</span>
                <span className="text-sm font-semibold tabular">{dateNavFmt.format(d.date).split(" ")[1]}</span>
                <span className="text-[9px] text-faint">{d.key === today ? "Today" : ""}</span>
              </Link>
            );
          })}
        </div>
        <Link
          href={`/interviewer/schedule?date=${addDaysKey(dayKey, 1)}`}
          className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-fg"
        >
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-3">
          {interviews.length === 0 && (
            <Card className="p-8 text-center">
              <Coffee size={22} className="mx-auto text-faint" />
              <p className="mt-3 text-sm font-semibold">No interviews on this date</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
                Your availability is published. Students can book any open slot up to 24 hours before it starts.
              </p>
              <Link href="/interviewer/availability" className="btn-ghost btn-sm mt-4">
                <CalendarClock size={13} /> Adjust availability
              </Link>
            </Card>
          )}

          {interviews.map((i) => {
            const meta = interviewStatusMeta(i.status);
            const isOpen = i.status === "BOOKED" || i.status === "AWAITING_OUTCOME";
            return (
              <div
                key={i.id}
                className={clsx(
                  "card p-4",
                  i.status === "AWAITING_OUTCOME" && "border-warn/25",
                  i.status === "BOOKED" && "border-info/20",
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="w-[86px] shrink-0">
                    <div className="text-sm font-semibold tabular">{formatIstTime(i.startsAt)}</div>
                    <div className="text-[10px] text-faint">{formatIstTimeRange(i.startsAt, i.endsAt)}</div>
                    <div className="mt-1 text-[10px] text-faint">30 min · Meet</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={i.student.user.name} hue={i.student.user.hue} size={30} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{i.student.user.name}</div>
                        <div className="text-[10px] text-faint">
                          {i.student.user.campus} · attempt {i.attemptNo} of {i.badge.maxAttempts}
                        </div>
                      </div>
                      <Chip tone={meta.tone} dot className="ml-auto">
                        {meta.label}
                      </Chip>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Chip>{i.badge.track.name}</Chip>
                      <Chip tone="accent">{i.badge.name}</Chip>
                      <Chip>
                        <Clock size={10} /> 30 min
                      </Chip>
                    </div>

                    {i.outcomeNote && (
                      <p className="mt-2 line-clamp-2 rounded-lg border-l-2 border-line-strong bg-ink/40 px-2.5 py-1.5 text-[11px] italic text-muted">
                        “{i.outcomeNote}”
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {isOpen && (
                        <>
                          <a href={i.meetingUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                            <Video size={12} /> Join
                          </a>
                          <OutcomeControl
                            interviewId={i.id}
                            studentName={i.student.user.name}
                            studentHue={i.student.user.hue}
                            trackName={i.badge.track.name}
                            badgeName={i.badge.name}
                            attemptNo={i.attemptNo}
                            status={i.status}
                            when={`${formatIstDay(i.startsAt)} · ${formatIstTimeRange(i.startsAt, i.endsAt)}`}
                          />
                        </>
                      )}
                      {!isOpen && (
                        <Link href="/admin/students" className="text-[11px] text-faint hover:text-fg">
                          View student record <ArrowRight size={11} className="inline" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <ListChecks size={14} className="text-warn" />
              <h2 className="text-xs font-semibold">Outcome queue</h2>
              <span className="ml-auto rounded-full bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                {pending.length}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              Students wait up to 24 hours. Recording the outcome sends the result message and updates the badge
              instantly.
            </p>
            <div className="mt-3 space-y-2">
              {pending.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
                  <Avatar name={p.student.user.name} hue={p.student.user.hue} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium">{p.student.user.name}</div>
                    <div className="text-[10px] text-faint">{formatIstDay(p.startsAt)} · {formatIstTime(p.startsAt)}</div>
                  </div>
                  <OutcomeControl
                    interviewId={p.id}
                    studentName={p.student.user.name}
                    studentHue={p.student.user.hue}
                    trackName={p.badge.track.name}
                    badgeName={p.badge.name}
                    attemptNo={p.attemptNo}
                    status={p.status}
                    when={`${formatIstDay(p.startsAt)} · ${formatIstTimeRange(p.startsAt, p.endsAt)}`}
                  />
                </div>
              ))}
              {pending.length === 0 && (
                <div className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-[11px] text-faint">
                  Nothing waiting. Nice.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-accent" />
              <h2 className="text-xs font-semibold">Next up</h2>
            </div>
            {upcoming ? (
              <>
                <div className="text-xs font-semibold">{upcoming.student.user.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {formatIstDayLong(upcoming.startsAt)} · {formatIstTimeRange(upcoming.startsAt, upcoming.endsAt)} IST
                </div>
                <a href={upcoming.meetingUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm mt-3">
                  <Video size={12} /> Open Meet
                </a>
              </>
            ) : (
              <p className="text-[11px] text-muted">No upcoming bookings yet. New slots appear as students book.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-xs font-semibold">Recording rules</h2>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
              <li>• <span className="text-fg">Pass</span> awards the badge and Miles immediately.</li>
              <li>• <span className="text-fg">Retake</span> keeps the badge alive with a 7-day cooldown.</li>
              <li>• <span className="text-fg">Fail</span> uses the attempt and sets a 14-day cooldown.</li>
              <li>• No-show is recorded after a 10-minute wait.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
