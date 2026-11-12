import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarOff, CalendarPlus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { addTimeOff, removeTimeOffForm } from "@/app/actions/interviewer";
import { addDaysKey, formatIstDay, istDateKey, istToUtc } from "@/lib/time";
import { Card, Chip } from "@/components/ui";
import { AvailabilityEditor } from "@/components/interviewer/AvailabilityEditor";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (user.role !== "INTERVIEWER" || !user.interviewerProfileId) redirect(homeForRole(user.role));

  const profile = await prisma.interviewerProfile.findUniqueOrThrow({
    where: { id: user.interviewerProfileId },
    include: { rules: true, exceptions: { orderBy: { date: "asc" } } },
  });

  const today = istDateKey();
  const horizon = istToUtc(addDaysKey(today, 14), 0);

  const slots = await prisma.interviewSlot.findMany({
    where: { interviewerId: profile.id, startsAt: { gte: new Date(), lt: horizon } },
    orderBy: { startsAt: "asc" },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(today, i);
    const daySlots = slots.filter((s) => istDateKey(s.startsAt) === key);
    return {
      key,
      date: istToUtc(key, 12 * 60),
      open: daySlots.filter((s) => s.status === "OPEN").length,
      booked: daySlots.filter((s) => s.status === "BOOKED" || s.status === "COMPLETED").length,
    };
  });

  const totalOpen = slots.filter((s) => s.status === "OPEN").length;
  const totalBooked = slots.filter((s) => s.status === "BOOKED").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/interviewer/schedule" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-fg">
            <ArrowLeft size={12} /> Back to schedule
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Availability</h1>
          <p className="mt-1 text-xs text-muted">
            Set the windows students can book. Slots are published 14 days ahead, in IST.
          </p>
        </div>
        <div className="flex gap-2">
          <Chip tone="success" dot>
            {totalOpen} open slots
          </Chip>
          <Chip tone="info" dot>
            {totalBooked} booked
          </Chip>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <AvailabilityEditor
          initialRules={profile.rules.map((r) => ({
            weekday: r.weekday,
            startMin: r.startMin,
            endMin: r.endMin,
            active: r.active,
          }))}
          slotMinutes={profile.slotMinutes}
          bufferMinutes={profile.bufferMinutes}
        />

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <CalendarPlus size={14} className="text-accent" />
              <h2 className="text-xs font-semibold">Block a date</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              Already-booked students on that date are cancelled automatically, notified, and their attempt is
              returned.
            </p>
            <form action={addTimeOff} className="mt-3 space-y-2">
              <input type="date" name="date" min={today} required className="field text-xs" />
              <input name="note" placeholder="Reason (e.g. faculty review day)" className="field text-xs" />
              <button className="btn-ghost btn-sm w-full">
                <CalendarOff size={12} /> Mark unavailable
              </button>
            </form>

            <div className="mt-3 space-y-1.5">
              {profile.exceptions.length === 0 && (
                <p className="rounded-lg border border-dashed border-line-strong px-2.5 py-2 text-center text-[10px] text-faint">
                  No time off booked.
                </p>
              )}
              {profile.exceptions.map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-lg border border-warn/20 bg-warn/[0.06] px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-warn">{formatIstDay(istToUtc(e.date, 720))}</div>
                    <div className="truncate text-[10px] text-faint">{e.note ?? "Time off"}</div>
                  </div>
                  <form action={removeTimeOffForm}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="rounded p-1 text-faint transition hover:bg-danger/10 hover:text-danger" aria-label="Remove">
                      <Trash2 size={12} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xs font-semibold">Next 7 days</h2>
            <p className="mt-0.5 text-[11px] text-muted">What students currently see.</p>
            <div className="mt-3 space-y-1">
              {days.map((d) => (
                <div key={d.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                  <span className="w-16 text-[11px] text-muted">{formatIstDay(d.date)}</span>
                  <div className="flex flex-1 items-center gap-1">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <span
                        className="block h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.min(100, (d.open / 12) * 100)}%` }}
                      />
                    </span>
                  </div>
                  <span className="w-14 text-right text-[10px] text-faint">{d.open} open</span>
                  <span className="w-16 text-right text-[10px] text-faint">{d.booked} booked</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
