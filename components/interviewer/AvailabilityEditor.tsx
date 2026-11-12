"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertCircle, Check, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { saveAvailability } from "@/app/actions/interviewer";
import { WEEKDAYS, minutesToLabel } from "@/lib/time";

type Rule = { weekday: number; startMin: number; endMin: number; active: boolean };

const TIMES = Array.from({ length: 33 }, (_, i) => 6 * 60 + i * 30); // 06:00 -> 22:00

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilityEditor({
  initialRules,
  slotMinutes,
  bufferMinutes,
}: {
  initialRules: Rule[];
  slotMinutes: number;
  bufferMinutes: number;
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  function addWindow(weekday: number) {
    setRules((prev) => [...prev, { weekday, startMin: 10 * 60, endMin: 13 * 60, active: true }]);
    setSaved(null);
  }

  function removeWindow(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setSaved(null);
  }

  function update(index: number, patch: Partial<Rule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSaved(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveAvailability({ rules });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(res.created ?? 0);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Weekly template</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              {slotMinutes}-minute slots with a {bufferMinutes}-minute buffer. Changes only regenerate unbooked
              future slots — booked interviews are never touched.
            </p>
          </div>
          <button onClick={save} disabled={pending} className="btn-primary btn-sm">
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save template
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {saved !== null && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent">
            <Check size={13} /> Saved. {saved} open slots published for the next 14 days.
          </div>
        )}

        <div className="mt-4 space-y-2">
          {ORDER.map((weekday) => {
            const windows = rules
              .map((r, index) => ({ ...r, index }))
              .filter((r) => r.weekday === weekday);

            return (
              <div
                key={weekday}
                className={clsx(
                  "rounded-xl border px-3 py-2.5",
                  windows.length ? "border-line bg-surface-2/50" : "border-dashed border-line-strong",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={clsx("w-24 text-xs font-medium", windows.length ? "text-fg" : "text-faint")}>
                    {WEEKDAYS[weekday]}
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {windows.length === 0 && <span className="text-[11px] text-faint">Unavailable</span>}
                    {windows.map((w) => (
                      <div key={w.index} className="flex items-center gap-1.5">
                        <select
                          value={w.startMin}
                          onChange={(e) => update(w.index, { startMin: Number(e.target.value) })}
                          className="rounded-lg border border-line-strong bg-ink/70 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent/50"
                        >
                          {TIMES.map((t) => (
                            <option key={t} value={t}>
                              {minutesToLabel(t)}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-faint">to</span>
                        <select
                          value={w.endMin}
                          onChange={(e) => update(w.index, { endMin: Number(e.target.value) })}
                          className="rounded-lg border border-line-strong bg-ink/70 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent/50"
                        >
                          {TIMES.map((t) => (
                            <option key={t} value={t}>
                              {minutesToLabel(t)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeWindow(w.index)}
                          className="rounded p-1 text-faint transition hover:bg-danger/10 hover:text-danger"
                          aria-label="Remove window"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addWindow(weekday)}
                    className="rounded-lg border border-line-strong px-2 py-1 text-[10px] text-muted transition hover:border-accent/40 hover:text-accent"
                  >
                    <Plus size={11} className="mr-1 inline" />
                    Window
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
