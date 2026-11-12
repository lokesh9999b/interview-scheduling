"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, X } from "lucide-react";
import { cancelInterview } from "@/app/actions/student";
import { MAX_RESCHEDULES } from "@/lib/state-machine";

export function InterviewActions({
  interviewId,
  canManage,
  startsAtIso,
  rescheduleCount,
}: {
  interviewId: string;
  canManage: boolean;
  startsAtIso: string;
  rescheduleCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insideWindow = new Date(startsAtIso).getTime() - Date.now() < 24 * 3_600_000;

  function onCancel() {
    startTransition(async () => {
      const res = await cancelInterview(interviewId);
      if ("error" in res) {
        setError(res.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  }

  if (!canManage) {
    return (
      <p className="text-[11px] text-faint">
        Reschedule and cancel close 24 hours before your slot.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {rescheduleCount < MAX_RESCHEDULES ? (
          <a href={`/student/book?reschedule=${interviewId}`} className="btn-ghost btn-sm">
            <CalendarClock size={13} />
            Reschedule ({MAX_RESCHEDULES - rescheduleCount} left)
          </a>
        ) : (
          <span className="text-[11px] text-faint">
            Reschedule limit reached ({MAX_RESCHEDULES}/{MAX_RESCHEDULES}).
          </span>
        )}
        {confirming ? (
          <span className="flex items-center gap-1.5">
            <button onClick={onCancel} disabled={pending} className="btn-danger btn-sm">
              {pending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              Yes, cancel it
            </button>
            <button onClick={() => setConfirming(false)} className="btn-ghost btn-sm">
              Keep it
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn-ghost btn-sm text-muted">
            Cancel
          </button>
        )}
      </div>
      <p className="text-[11px] text-faint">
        {insideWindow
          ? "Inside the 24-hour window — contact Interview Ops to make a change. Your attempt stays safe."
          : "Free to change up to 24 hours before. Cancelling does not use an attempt."}
      </p>
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
