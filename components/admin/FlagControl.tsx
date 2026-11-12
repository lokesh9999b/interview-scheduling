"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldX, X } from "lucide-react";
import { flagMalpractice } from "@/app/actions/admin";

export function FlagControl({
  studentProfileId,
  studentName,
  badgeLabel,
}: {
  studentProfileId: string;
  studentName: string;
  badgeLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await flagMalpractice({ studentProfileId, reason });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-danger btn-sm">
        <ShieldX size={12} /> Nullify badge
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="rise w-full max-w-md rounded-2xl border border-danger/25 bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle size={15} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Malpractice review</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold">
                  Nullify {studentName}&apos;s {badgeLabel}?
                </h3>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-faint hover:bg-white/5">
                <X size={15} />
              </button>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              This revokes the badge, reverses the Miles, removes Qualiflyer status, and writes an audit entry.
              The student gets 7 days to appeal.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="What was confirmed? e.g. screen recording showed a second person answering off-camera."
              className="field mt-3 resize-none text-xs"
            />

            {error && (
              <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button onClick={submit} disabled={pending} className="btn-danger btn-sm">
                {pending ? <Loader2 size={12} className="animate-spin" /> : <ShieldX size={12} />}
                Confirm nullification
              </button>
              <button onClick={() => setOpen(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
