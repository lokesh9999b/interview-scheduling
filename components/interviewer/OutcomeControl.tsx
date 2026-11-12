"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { markNoShow, recordOutcome } from "@/app/actions/interviewer";
import { Avatar } from "@/components/ui";

type Props = {
  interviewId: string;
  studentName: string;
  studentHue: number;
  trackName: string;
  badgeName: string;
  attemptNo: number;
  status: string;
  when: string;
};

const OUTCOMES = [
  {
    value: "PASS" as const,
    label: "Pass",
    hint: "Badge + Miles awarded immediately",
    icon: <CheckCircle2 size={16} />,
    tone: "border-accent/40 bg-accent/10 text-accent",
  },
  {
    value: "RETAKE" as const,
    label: "Retake later",
    hint: "7-day cooldown, attempt not failed",
    icon: <RotateCcw size={16} />,
    tone: "border-warn/40 bg-warn/10 text-warn",
  },
  {
    value: "FAIL" as const,
    label: "Fail",
    hint: "14-day cooldown, counts as an attempt",
    icon: <XCircle size={16} />,
    tone: "border-danger/40 bg-danger/10 text-danger",
  },
];

export function OutcomeControl(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<"PASS" | "FAIL" | "RETAKE">("PASS");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const awaiting = props.status === "AWAITING_OUTCOME";

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await recordOutcome({ interviewId: props.interviewId, outcome, note });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function noShow() {
    startTransition(async () => {
      const res = await markNoShow(props.interviewId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx("btn-sm", awaiting ? "btn-primary" : "btn-ghost")}
      >
        <ClipboardCheck size={13} />
        {awaiting ? "Record outcome" : "Record"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="rise max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={props.studentName} hue={props.studentHue} size={36} />
                <div>
                  <div className="text-sm font-semibold">{props.studentName}</div>
                  <div className="text-[11px] text-faint">
                    {props.trackName} · {props.badgeName} · attempt {props.attemptNo}
                  </div>
                  <div className="text-[11px] text-faint">{props.when} IST</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-faint hover:bg-white/5 hover:text-fg">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <div className="label mb-2">Outcome</div>
                <div className="space-y-2">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setOutcome(o.value)}
                      className={clsx(
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        outcome === o.value ? o.tone : "border-line bg-surface-2/50 text-muted hover:border-line-strong",
                      )}
                    >
                      <span className="mt-0.5">{o.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">{o.label}</span>
                        <span className="block text-[10px] opacity-80">{o.hint}</span>
                      </span>
                      <span
                        className={clsx(
                          "mt-1 h-3.5 w-3.5 rounded-full border",
                          outcome === o.value ? "border-current bg-current" : "border-line-strong",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="label mb-1.5">Feedback for the student</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="What went well, and the one thing to work on. This is quoted verbatim in the result message."
                  className="field resize-none text-xs leading-relaxed"
                />
                <p className="mt-1 text-[10px] text-faint">
                  Required for fail and retake. Visible to the student and to Interview Ops.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button onClick={submit} disabled={pending} className="btn-primary btn-sm">
                  {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Save outcome
                </button>
                <button onClick={noShow} disabled={pending} className="btn-ghost btn-sm">
                  Mark no-show
                </button>
                <span className="ml-auto text-[10px] text-faint">Student is notified immediately</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
