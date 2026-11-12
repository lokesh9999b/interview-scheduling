import clsx from "clsx";
import { Check, X } from "lucide-react";
import type { Snapshot } from "@/lib/view";

const STAGES = ["Skills", "Eligible", "Booked", "Interview", "Outcome"];

function stageIndex(status: string) {
  switch (status) {
    case "IN_PROGRESS":
    case "INELIGIBLE":
      return 0;
    case "ELIGIBLE":
      return 1;
    case "BOOKED":
      return 2;
    case "AWAITING_OUTCOME":
      return 3;
    case "PASSED":
    case "FAILED":
    case "RETAKE_REQUIRED":
    case "NO_SHOW":
    case "REVOKED":
      return 4;
    default:
      return 0;
  }
}

export function JourneyStepper({ snapshot }: { snapshot: Snapshot }) {
  const current = stageIndex(snapshot.status);
  const negative = ["FAILED", "NO_SHOW", "REVOKED"].includes(snapshot.status);
  const warn = snapshot.status === "RETAKE_REQUIRED";

  return (
    <div className="flex items-start">
      {STAGES.map((stage, i) => {
        const complete = i < current;
        const active = i === current;
        return (
          <div key={stage} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={clsx(
                  "h-px flex-1",
                  i === 0 ? "bg-transparent" : complete || active ? "bg-accent/40" : "bg-line",
                )}
              />
              <span
                className={clsx(
                  "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                  complete && "border-accent/50 bg-accent/15 text-accent",
                  active && !negative && !warn && "border-accent bg-accent text-ink",
                  active && negative && "border-danger bg-danger/20 text-danger",
                  active && warn && "border-warn bg-warn/20 text-warn",
                  !complete && !active && "border-line-strong bg-surface-2 text-faint",
                )}
              >
                {complete ? <Check size={12} /> : active && negative ? <X size={12} /> : i + 1}
              </span>
              <span
                className={clsx(
                  "h-px flex-1",
                  i === STAGES.length - 1 ? "bg-transparent" : complete ? "bg-accent/40" : "bg-line",
                )}
              />
            </div>
            <span
              className={clsx(
                "mt-2 text-[10px] font-medium tracking-wide",
                active ? (negative ? "text-danger" : warn ? "text-warn" : "text-fg") : complete ? "text-muted" : "text-faint",
              )}
            >
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
