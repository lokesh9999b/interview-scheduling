"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Clock, Loader2, Timer, User, Video } from "lucide-react";
import { bookSlot } from "@/app/actions/student";
import { Chip } from "@/components/ui";

type Slot = { id: string; time: string; interviewerName: string; interviewerTitle: string };
type Group = {
  dateKey: string;
  weekday: string;
  day: string;
  month: string;
  relative: string;
  slots: Slot[];
};

export function BookingClient({
  groups,
  badgeId,
  rescheduleFrom,
  trackName,
  badgeName,
  windowDays,
}: {
  groups: Group[];
  badgeId: string;
  rescheduleFrom: string | null;
  trackName: string;
  badgeName: string;
  windowDays: number;
}) {
  const router = useRouter();
  const [activeDate, setActiveDate] = useState(groups[0]?.dateKey ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [heldAt, setHeldAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600);

  const activeGroup = useMemo(
    () => groups.find((g) => g.dateKey === activeDate) ?? groups[0],
    [groups, activeDate],
  );

  const selected = useMemo(() => {
    for (const g of groups) {
      const slot = g.slots.find((s) => s.id === selectedId);
      if (slot) return { group: g, slot };
    }
    return null;
  }, [groups, selectedId]);

  useEffect(() => {
    if (!heldAt) return;
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, 600 - Math.floor((Date.now() - heldAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [heldAt]);

  function select(slotId: string) {
    setSelectedId(slotId);
    setError(null);
    setHeldAt(Date.now());
    setSecondsLeft(600);
  }

  function confirm() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const res = await bookSlot({ slotId: selectedId, badgeId, rescheduleFrom });
      if (res && "error" in res) {
        setError(res.error);
        setSelectedId(null);
        router.refresh();
      }
    });
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-accent" />
              <h2 className="text-xs font-semibold">Pick a date</h2>
            </div>
            <span className="text-[10px] text-faint">
              Next {windowDays} days · {groups.reduce((n, g) => n + g.slots.length, 0)} slots
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {groups.map((g) => {
              const active = g.dateKey === activeDate;
              return (
                <button
                  key={g.dateKey}
                  onClick={() => {
                    setActiveDate(g.dateKey);
                    setSelectedId(null);
                  }}
                  className={clsx(
                    "flex w-[68px] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition",
                    active
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wide">{g.weekday}</span>
                  <span className={clsx("text-lg font-semibold leading-tight tabular", active && "text-accent")}>
                    {g.day}
                  </span>
                  <span className="text-[10px] text-faint">{g.month}</span>
                  <span className="mt-0.5 text-[9px] text-faint">{g.slots.length} slots</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold">
              {activeGroup ? `${activeGroup.weekday}, ${activeGroup.day} ${activeGroup.month}` : "Slots"}
            </h2>
            <span className="text-[10px] text-faint">All times IST</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {activeGroup?.slots.map((slot) => {
              const active = slot.id === selectedId;
              return (
                <button
                  key={slot.id}
                  onClick={() => select(slot.id)}
                  className={clsx(
                    "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-accent bg-accent/[0.09] shadow-[0_0_20px_-8px_rgba(201,247,91,0.6)]"
                      : "border-line bg-surface-2/50 hover:border-line-strong hover:bg-surface-3",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-semibold",
                      active ? "border-accent/50 bg-accent/15 text-accent" : "border-line-strong text-muted",
                    )}
                  >
                    {slot.time.split(":")[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tabular">{slot.time}</span>
                    <span className="block truncate text-[10px] text-faint">{slot.interviewerName}</span>
                  </span>
                  {active ? (
                    <CheckCircle2 size={15} className="text-accent" />
                  ) : (
                    <ArrowRight size={13} className="text-faint opacity-0 transition group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>

          {activeGroup?.slots.length === 0 && (
            <p className="py-6 text-center text-xs text-faint">No slots left on this date — try another day.</p>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-surface-2/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Video size={14} className="text-accent" />
              <span className="text-xs font-semibold">Your booking</span>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <div className="label">Badge</div>
              <div className="mt-0.5 text-xs font-medium">
                {trackName} · {badgeName}
              </div>
            </div>

            {selected ? (
              <>
                <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-3">
                  <div className="text-[10px] uppercase tracking-wide text-accent">
                    {selected.group.weekday}, {selected.group.day} {selected.group.month}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <Clock size={13} className="text-accent" />
                    <span className="text-lg font-semibold tabular">{selected.slot.time}</span>
                    <span className="text-[10px] text-faint">IST · 30 min</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                    <User size={11} />
                    {selected.slot.interviewerName} · {selected.slot.interviewerTitle}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-[10px] text-muted">
                  <Timer size={12} className="text-warn" />
                  Slot held for <span className="font-mono tabular text-warn">{mm}:{ss}</span> while you confirm
                </div>

                <button onClick={confirm} disabled={pending} className="btn-primary w-full">
                  {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {rescheduleFrom ? "Confirm new slot" : "Confirm booking"}
                </button>
                <p className="text-center text-[10px] leading-relaxed text-faint">
                  Free to reschedule or cancel up to 24 hours before. Booking closes 24 hours ahead.
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-line-strong px-3 py-8 text-center">
                <CalendarDays size={20} className="mx-auto text-faint" />
                <p className="mt-2 text-[11px] text-faint">
                  Pick a date, then a time. We&apos;ll hold it while you confirm.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] leading-relaxed text-danger">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-line bg-surface-2/40 px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              <Chip>Google Meet link</Chip>
              <Chip>Reminder 24h before</Chip>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
