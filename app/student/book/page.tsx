import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarX2, Lock, ShieldCheck } from "lucide-react";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { getSnapshot } from "@/lib/view";
import { getBookableSlots } from "@/lib/slots";
import { istDateKey, formatIstTime } from "@/lib/time";
import { canBook, BOOKING_WINDOW_DAYS } from "@/lib/state-machine";
import { BookingClient } from "@/components/booking/BookingClient";
import { Card, Chip, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ reschedule?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT" || !user.studentProfileId) redirect(homeForRole(user.role));

  const params = await searchParams;
  const snapshot = await getSnapshot(user.studentProfileId);

  const rescheduleFrom = params.reschedule ?? null;
  const active = snapshot.activeInterview;

  const guard = canBook({
    progressStatus: snapshot.status,
    cooldownUntil: snapshot.cooldownUntil,
    attemptsUsed: snapshot.attemptsUsed,
    maxAttempts: snapshot.maxAttempts,
    hasActiveInterview: Boolean(active) && !rescheduleFrom,
    attendancePct: snapshot.attendancePct,
    registrationStatus: snapshot.registrationStatus,
    conductStatus: snapshot.conductStatus,
  });

  const blocked = rescheduleFrom
    ? !active || active.id !== rescheduleFrom
      ? "That interview can no longer be rescheduled."
      : null
    : guard.ok
      ? null
      : guard.reason;

  const slots = blocked ? [] : await getBookableSlots();
  const todayKey = istDateKey();

  const groups = new Map<
    string,
    {
      dateKey: string;
      weekday: string;
      day: string;
      month: string;
      relative: string;
      slots: {
        id: string;
        time: string;
        interviewerName: string;
        interviewerTitle: string;
      }[];
    }
  >();

  const weekdayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });
  const dayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
  const monthFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" });

  for (const slot of slots) {
    const key = istDateKey(slot.startsAt);
    if (!groups.has(key)) {
      const offset = Math.round(
        (new Date(`${key}T00:00:00Z`).getTime() - new Date(`${todayKey}T00:00:00Z`).getTime()) / 86_400_000,
      );
      groups.set(key, {
        dateKey: key,
        weekday: weekdayFmt.format(slot.startsAt),
        day: dayFmt.format(slot.startsAt),
        month: monthFmt.format(slot.startsAt),
        relative: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : `${offset} days`,
        slots: [],
      });
    }
    groups.get(key)!.slots.push({
      id: slot.id,
      time: formatIstTime(slot.startsAt),
      interviewerName: slot.interviewer.user.name,
      interviewerTitle: slot.interviewer.title,
    });
  }

  const dayGroups = Array.from(groups.values());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/student" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-fg">
            <ArrowLeft size={12} /> Back to dashboard
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            {rescheduleFrom ? "Move your interview" : "Book your Level Clearance Interview"}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {snapshot.trackName} · {snapshot.badgeName} Badge · attempt {snapshot.attemptsUsed + 1} of{" "}
            {snapshot.maxAttempts}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="info">30 minutes</Chip>
          <Chip tone="info">Google Meet</Chip>
          <Chip tone="info">1:1</Chip>
        </div>
      </div>

      {rescheduleFrom && (
        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/[0.07] px-4 py-3">
          <CalendarX2 size={15} className="mt-0.5 shrink-0 text-info" />
          <p className="text-xs leading-relaxed text-info">
            Picking a new slot releases your current one. You keep the same attempt number, and the
            change is free because you&apos;re more than 24 hours out.
          </p>
        </div>
      )}

      {blocked ? (
        <Card className="p-6">
          <EmptyState
            icon={<Lock size={26} />}
            title="Booking is locked right now"
            body={blocked}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/student" className="btn-ghost btn-sm">
                  Back to dashboard
                </Link>
                <a href="mailto:interviews@grit.niatindia.com" className="btn-primary btn-sm">
                  Contact Interview Ops
                </a>
              </div>
            }
          />
        </Card>
      ) : dayGroups.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<AlertTriangle size={26} />}
            title="No open slots in the next 14 days"
            body="Every slot is booked or the interviewers haven't published availability yet. We'll notify you the moment new slots open — you don't lose your place in the queue."
            action={
              <button className="btn-primary btn-sm" disabled>
                Notify me when slots open
              </button>
            }
          />
        </Card>
      ) : (
        <BookingClient
          groups={dayGroups}
          badgeId={snapshot.badgeId}
          rescheduleFrom={rescheduleFrom}
          trackName={snapshot.trackName}
          badgeName={snapshot.badgeName}
          windowDays={BOOKING_WINDOW_DAYS}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "What happens in the 30 minutes",
            body: "A working session, not an exam. You'll demo one build and defend two decisions.",
          },
          {
            title: "What to bring",
            body: "Student ID, a screen you can share, and your latest project running locally.",
          },
          {
            title: "If you can't make it",
            body: "Cancel or reschedule free up to 24 hours before. Cancelling never uses an attempt.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-line bg-surface/60 px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
              <ShieldCheck size={12} className="text-accent/80" /> {c.title}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
