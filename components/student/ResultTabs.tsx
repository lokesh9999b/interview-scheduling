"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { MessageCopy } from "@/lib/messages";

const TABS = [
  { key: "PASS", label: "Pass", icon: <CheckCircle2 size={12} /> },
  { key: "RETAKE", label: "Retake", icon: <RotateCcw size={12} /> },
  { key: "FAIL", label: "Fail", icon: <XCircle size={12} /> },
];

export function ResultTabs({ copies }: { copies: Record<string, MessageCopy> }) {
  const [active, setActive] = useState("PASS");
  const copy = copies[active];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
            <CheckCircle2 size={12} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Message 3 · Result</span>
        </div>
        <div className="flex gap-1 rounded-lg border border-line bg-surface-2/60 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={clsx(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition",
                active === t.key ? "bg-accent text-ink" : "text-muted hover:text-fg",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold">{copy.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">{copy.body}</p>
      {copy.ctaLabel && (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
          {copy.ctaLabel} →
        </span>
      )}
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-[10px] text-faint">
        <span>In-app + email</span>
        <span>·</span>
        <span>Sent when the interviewer saves the outcome</span>
      </div>
    </div>
  );
}
