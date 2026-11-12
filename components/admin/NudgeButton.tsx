"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Loader2 } from "lucide-react";
import { nudgeStudent } from "@/app/actions/admin";

export function NudgeButton({ studentProfileId }: { studentProfileId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <span className="chip border-accent/30 bg-accent/10 text-accent">
        <Check size={11} /> Nudged
      </span>
    );
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const res = await nudgeStudent(studentProfileId);
          if ("ok" in res) {
            setSent(true);
            router.refresh();
          }
        })
      }
      disabled={pending}
      className="btn-ghost btn-sm"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
      Nudge
    </button>
  );
}
