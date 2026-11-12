"use client";

import { useEffect, useState } from "react";

function humanise(ms: number) {
  if (ms <= 0) return "starting now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

export function Countdown({ to, className }: { to: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return <span className={className}>—</span>;
  const ms = new Date(to).getTime() - now;
  return <span className={className}>{humanise(ms)}</span>;
}
