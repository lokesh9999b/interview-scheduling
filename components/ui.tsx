import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

const TONES: Record<string, string> = {
  success: "border-accent/30 bg-accent/10 text-accent",
  accent: "border-accent/30 bg-accent/10 text-accent",
  info: "border-info/30 bg-info/10 text-info",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-line-strong bg-surface-2 text-muted",
};

export function Chip({
  children,
  tone = "muted",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES | string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={clsx("chip", TONES[tone] ?? TONES.muted, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Avatar({ name, hue = 150, size = 36 }: { name: string; hue?: number; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 font-semibold text-ink"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, hsl(${hue} 70% 72%), hsl(${hue + 28} 62% 52%))`,
      }}
    >
      {initials.toUpperCase()}
    </span>
  );
}

export function Progress({ value, total, tone = "accent" }: { value: number; total: number; tone?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, total)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500",
          tone === "accent" ? "bg-accent" : tone === "info" ? "bg-info" : "bg-warn",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
      <div className="label">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-faint">{hint}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-fg">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/40 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={clsx("h-px w-full bg-line", className)} />;
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-muted">{k}</span>
      <span className="text-right text-xs font-medium text-fg">{v}</span>
    </div>
  );
}
