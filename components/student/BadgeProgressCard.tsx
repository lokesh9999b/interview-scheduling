import clsx from "clsx";
import { Check, Lock, Mic, Sparkles } from "lucide-react";
import type { Snapshot } from "@/lib/view";
import { BadgeMedallion } from "./BadgeMedallion";
import { Chip } from "@/components/ui";
import { journeyMeta } from "@/lib/state-machine";

export function BadgeProgressCard({ snapshot }: { snapshot: Snapshot }) {
  const s = snapshot;
  const meta = journeyMeta(s.status);
  const interviewDone = ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW", "AWAITING_OUTCOME", "REVOKED"].includes(s.status);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <BadgeMedallion
          level={s.level}
          track={s.trackName}
          state={s.status === "PASSED" ? "earned" : s.status === "REVOKED" ? "revoked" : "locked"}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <div className="label">Current badge</div>
          <h2 className="text-base font-semibold">
            {s.trackName} · {s.badgeName}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {s.skillsCleared} of {s.skillsTotal} skills cleared
          </p>
        </div>
        <Chip tone={meta.tone} dot>
          {meta.label}
        </Chip>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {s.skills.map((skill, index) => {
          const done = index < s.skillsCleared;
          return (
            <div
              key={skill}
              className={clsx(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
                done ? "border-line bg-surface-2/70" : "border-dashed border-line-strong bg-transparent",
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-accent/15 text-accent" : "bg-white/5 text-faint",
                )}
              >
                {done ? <Check size={12} /> : <Lock size={10} />}
              </span>
              <span className={clsx("text-xs", done ? "text-fg" : "text-faint")}>{skill}</span>
            </div>
          );
        })}

        <div
          className={clsx(
            "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 sm:col-span-2",
            interviewDone ? "border-info/25 bg-info/[0.06]" : "border-dashed border-line-strong",
          )}
        >
          <span
            className={clsx(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              interviewDone ? "bg-info/15 text-info" : "bg-white/5 text-faint",
            )}
          >
            {interviewDone ? <Check size={12} /> : <Mic size={10} />}
          </span>
          <span className={clsx("text-xs", interviewDone ? "text-fg" : "text-faint")}>
            Level Clearance Interview
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-faint">
            {s.status === "PASSED" ? "Cleared" : interviewDone ? "Completed" : "Locked"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5 sm:col-span-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-faint">
            <Sparkles size={10} />
          </span>
          <span className="text-xs text-faint">{s.badgeName} Badge + {250} Miles</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-faint">
            {s.status === "PASSED" ? "Awarded" : s.status === "REVOKED" ? "Revoked" : "On pass"}
          </span>
        </div>
      </div>
    </section>
  );
}
