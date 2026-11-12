import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { getSnapshot } from "@/lib/view";
import { formatIstDayLong, formatIstTime } from "@/lib/time";
import { journeyMeta } from "@/lib/state-machine";
import { Avatar, Card, Chip, Divider, Stat } from "@/components/ui";
import { StatusHero } from "@/components/student/StatusHero";
import { BadgeProgressCard } from "@/components/student/BadgeProgressCard";
import { JourneyStepper } from "@/components/student/JourneyStepper";

export const dynamic = "force-dynamic";

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT" || !user.studentProfileId) redirect(homeForRole(user.role));

  const params = await searchParams;
  const snapshot = await getSnapshot(user.studentProfileId);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { sentAt: "desc" },
    take: 3,
  });
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });

  const history = snapshot.interviews.filter(
    (i) => !["BOOKED", "AWAITING_OUTCOME"].includes(i.status),
  );

  const nextBadge = await prisma.badge.findFirst({
    where: {
      track: { slug: snapshot.trackName.toLowerCase().replace(/\s+/g, "-") },
      level: "SPECIALIST",
    },
  });

  const greeting = snapshot.name.split(" ")[0];

  return (
    <div className="space-y-5">
      {params.booked === "1" && (
        <div className="rise flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.08] px-4 py-3">
          <CheckCircle2 size={16} className="text-accent" />
          <p className="flex-1 text-xs text-fg">
            Your slot is confirmed. The booking message is in your inbox, and a reminder lands 24 hours before.
          </p>
          <Link href="/student/messages" className="link text-xs">
            Read the message
          </Link>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={snapshot.name} hue={snapshot.hue} size={44} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Hi {greeting}</h1>
              {snapshot.qualiflyer && <Chip tone="success">Qualiflyer</Chip>}
              {snapshot.status === "REVOKED" && <Chip tone="danger">Badge revoked</Chip>}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
              <span>{snapshot.campus}</span>
              <span>·</span>
              <span>Cohort {snapshot.cohort}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={10} /> {snapshot.trackName}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/student/messages" className="btn-ghost btn-sm">
            <Inbox size={13} /> Inbox
            {unread > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-ink">{unread}</span>
            )}
          </Link>
          <Link href="/student/book" className="btn-primary btn-sm">
            <CalendarCheck2 size={13} /> Book interview
          </Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.62fr_1fr]">
        <div className="space-y-5">
          <StatusHero snapshot={snapshot} />

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Your journey to the badge</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Every state is derived from the interview record — no hard-coded screens.
                </p>
              </div>
              <Link href="/student/before-after" className="link hidden text-[11px] sm:block">
                Before / after
              </Link>
            </div>
            <JourneyStepper snapshot={snapshot} />
          </Card>

          <BadgeProgressCard snapshot={snapshot} />

          {history.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Interview history</h2>
                <span className="text-[11px] text-faint">{history.length} record{history.length === 1 ? "" : "s"}</span>
              </div>
              <div className="divide-y divide-line/70">
                {history.map((i) => {
                  const meta = journeyMeta(i.status);
                  return (
                    <div key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="w-24 shrink-0">
                        <div className="text-xs font-medium">{formatIstDayLong(i.startsAt)}</div>
                        <div className="text-[10px] text-faint">
                          {formatIstTime(i.startsAt)} IST · Attempt {i.attemptNo}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-fg">{i.interviewerName}</div>
                        <div className="truncate text-[11px] text-faint">
                          {i.outcomeNote ?? i.cancelReason ?? "No notes recorded"}
                        </div>
                      </div>
                      <Chip tone={meta.tone} dot>
                        {meta.label}
                      </Chip>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {snapshot.events.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">State log</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Written on every transition, so support can reconstruct exactly what happened.
              </p>
              <ol className="mt-4 space-y-3">
                {snapshot.events.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                    <div className="min-w-0">
                      <div className="text-xs text-fg">
                        {journeyMeta(e.fromState).label} → <span className="font-medium">{journeyMeta(e.toState).label}</span>
                      </div>
                      <div className="text-[10px] text-faint">
                        {e.actorRole.toLowerCase()} · {formatIstDayLong(e.createdAt)} · {formatIstTime(e.createdAt)} IST
                        {e.reason ? ` · ${e.reason}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Miles" value={snapshot.miles} hint={snapshot.qualiflyer ? "Qualiflyer" : "Pre-Qualiflyer"} />
              <Stat label="Badges" value={snapshot.qualiflyer ? 1 : 0} hint={`${snapshot.badgeName} track`} />
              <Stat label="Attendance" value={`${snapshot.attendancePct}%`} hint={snapshot.attendancePct >= 75 ? "Eligible" : "Below 75%"} />
              <Stat
                label="Attempts"
                value={`${snapshot.attemptsUsed}/${snapshot.maxAttempts}`}
                hint={snapshot.attemptsUsed === 0 ? "None used yet" : "Used so far"}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <h2 className="text-xs font-semibold">Up next</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                {
                  label: "Clear every required skill",
                  done: snapshot.skillsCleared >= snapshot.skillsTotal,
                  hint: `${snapshot.skillsCleared}/${snapshot.skillsTotal} done`,
                },
                {
                  label: "Book a Level Clearance Interview",
                  done: ["BOOKED", "AWAITING_OUTCOME", "PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW", "REVOKED"].includes(snapshot.status),
                  hint: snapshot.status === "ELIGIBLE" ? "You can book now" : undefined,
                },
                {
                  label: "Attend the interview",
                  done: ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW", "REVOKED", "AWAITING_OUTCOME"].includes(snapshot.status),
                },
                {
                  label: `Earn the ${snapshot.badgeName} badge`,
                  done: snapshot.status === "PASSED",
                  hint: snapshot.status === "REVOKED" ? "Revoked" : undefined,
                },
              ].map((step) => (
                <li key={step.label} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      step.done ? "bg-accent/15 text-accent" : "border border-line-strong text-faint"
                    }`}
                  >
                    {step.done ? <CheckCircle2 size={11} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-[11px] ${step.done ? "text-muted line-through" : "text-fg"}`}>{step.label}</div>
                    {step.hint && <div className="text-[10px] text-faint">{step.hint}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {nextBadge && snapshot.status === "PASSED" && (
            <Card className="border-accent/20 p-4">
              <div className="flex items-center gap-2 text-accent">
                <TrendingUp size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Next up</span>
              </div>
              <p className="mt-2 text-xs font-semibold">{nextBadge.name} Badge</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                2 more skill levels and another interview. Your Novice badge already counts toward Qualiflyer.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-faint">
                <span>Unlocks after {snapshot.badgeName}</span>
                <ArrowRight size={11} />
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare size={14} className="text-info" />
              <h2 className="text-xs font-semibold">Need to change something?</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              Free reschedule or cancel up to 24 hours before your slot. Inside that window, Interview Ops
              handles it — your attempt stays safe.
            </p>
            <Divider className="my-3" />
            <a href="mailto:interviews@grit.niatindia.com" className="flex items-center gap-2 text-[11px] text-accent">
              <Mail size={12} /> interviews@grit.niatindia.com
            </a>
          </Card>

          {notifications.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold">Recent messages</h2>
                <Link href="/student/messages" className="text-[10px] text-accent">
                  All
                </Link>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 2).map((n) => (
                  <div key={n.id} className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
                    <div className="truncate text-[11px] font-medium text-fg">{n.title}</div>
                    <div className="mt-0.5 text-[10px] text-faint">
                      {formatIstDayLong(n.sentAt)} · {formatIstTime(n.sentAt)} IST
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
