import clsx from "clsx";
import { Award, RotateCcw, ShieldX } from "lucide-react";

export function BadgeMedallion({
  level,
  track,
  state = "earned",
  size = 96,
}: {
  level: string;
  track: string;
  state?: "earned" | "locked" | "revoked" | "pending";
  size?: number;
}) {
  const levelLabel = level.charAt(0) + level.slice(1).toLowerCase();
  const initials = track
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const ring =
    state === "earned"
      ? "border-accent/60 shadow-[0_0_40px_-10px_rgba(201,247,91,0.55)]"
      : state === "revoked"
        ? "border-danger/50"
        : state === "pending"
          ? "border-info/40"
          : "border-line-strong";

  const face =
    state === "earned"
      ? "bg-[radial-gradient(circle_at_30%_20%,rgba(201,247,91,0.28),rgba(11,17,16,0.9))]"
      : state === "revoked"
        ? "bg-[radial-gradient(circle_at_30%_20%,rgba(255,128,128,0.18),rgba(11,17,16,0.9))]"
        : "bg-surface-2";

  return (
    <div
      className={clsx("relative flex shrink-0 items-center justify-center rounded-full border-2", ring, face)}
      style={{ width: size, height: size }}
    >
      <div
        className={clsx(
          "absolute inset-[7px] rounded-full border border-dashed",
          state === "earned" ? "border-accent/30" : "border-white/10",
        )}
      />
      <div className="flex flex-col items-center leading-none">
        {state === "earned" ? (
          <Award size={size * 0.2} className="mb-1 text-accent" />
        ) : state === "revoked" ? (
          <ShieldX size={size * 0.2} className="mb-1 text-danger" />
        ) : state === "pending" ? (
          <RotateCcw size={size * 0.2} className="mb-1 text-info" />
        ) : null}
        <span
          className={clsx(
            "font-mono font-bold tracking-[0.18em]",
            state === "earned" ? "text-accent" : state === "revoked" ? "text-danger" : "text-faint",
          )}
          style={{ fontSize: size * 0.16 }}
        >
          {initials}
        </span>
        <span
          className={clsx(
            "mt-1 font-semibold uppercase tracking-[0.14em]",
            state === "earned" ? "text-fg" : "text-muted",
          )}
          style={{ fontSize: size * 0.09 }}
        >
          {levelLabel}
        </span>
      </div>
    </div>
  );
}
