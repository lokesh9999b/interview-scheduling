import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  MapPin,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import type { Snapshot } from "@/lib/view";
import { BadgeMedallion } from "./BadgeMedallion";
import { Countdown } from "@/components/Countdown";
import { InterviewActions } from "./InterviewActions";
import { CopyButton } from "@/components/CopyButton";
import { formatIstDayLong, formatIstTimeRange } from "@/lib/time";
import { Chip } from "@/components/ui";

const dayNum = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
const monthShort = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
const weekdayShort = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });

function Attempts({ used, max }: { used: number; max: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={clsx("h-1.5 w-5 rounded-full", i < used ? "bg-danger/80" : "bg-white/12")}
        />
      ))}
      <span className="ml-1 text-[11px] text-faint">
        {used} of {max} attempts used
      </span>
    </div>
  );
}

export function StatusHero({
  snapshot,
  compact = false,
  showActions = true,
}: {
  snapshot: Snapshot;
  compact?: boolean;
  showActions?: boolean;
}) {
  const s = snapshot;
  const pad = compact ? "p-4" : "p-5 sm:p-6";
  const interview = s.activeInterview ?? s.lastInterview;
  const cooling = s.cooldownUntil && s.cooldownUntil.getTime() > Date.now();

  /* ---------------------------------------------------------------- passed */
  if (s.status === "PASSED") {
    return (
      <section
        className={clsx(
          "relative overflow-hidden rounded-[22px] border border-accent/30 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(201,247,91,0.16),rgba(11,17,16,0.95))]",
          pad,
        )}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        <div className="flex flex-wrap items-start gap-5">
          <BadgeMedallion level={s.level} track={s.trackName} state="earned" size={compact ? 72 : 92} />
          <div className="min-w-0 flex-1">
            <Chip tone="success" dot>
              Badge awarded
            </Chip>
            <h2 className={clsx("mt-2 font-semibold leading-tight", compact ? "text-lg" : "text-2xl")}>
              You&apos;re a Qualiflyer, {s.name.split(" ")[0]}.
            </h2>
            <p className="mt-1 text-sm text-muted">
              {s.trackName} · {s.badgeName} Badge
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip tone="success">+{s.miles} Miles</Chip>
              <Chip tone="info">Qualiflyer</Chip>
              {s.awardedAt && <Chip>Cleared {formatIstDayLong(s.awardedAt)}</Chip>}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-ink/40 px-3.5 py-3">
            <div className="label">Credential ID</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-fg">{s.credentialId ?? "GRIT-PENDING"}</span>
              {!compact && <CopyButton value={s.credentialId ?? ""} />}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-ink/40 px-3.5 py-3">
            <div className="label">Next badge</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-fg">Specialist · 2 more skills</span>
              <Lock size={13} className="text-faint" />
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <Link href="/student/before-after" className="link inline-flex items-center gap-1">
              See the before / after <ArrowRight size={13} />
            </Link>
            <span className="text-faint">·</span>
            <span className="text-faint">Badge visible on your public profile and leaderboard</span>
          </div>
        )}
      </section>
    );
  }

  /* --------------------------------------------------------------- revoked */
  if (s.status === "REVOKED") {
    return (
      <section className={clsx("rounded-[22px] border border-danger/30 bg-danger/[0.06]", pad)}>
        <div className="flex items-start gap-4">
          <BadgeMedallion level={s.level} track={s.trackName} state="revoked" size={compact ? 64 : 80} />
          <div>
            <Chip tone="danger" dot>
              Badge nullified
            </Chip>
            <h2 className={clsx("mt-2 font-semibold", compact ? "text-lg" : "text-xl")}>
              Your {s.badgeName} Badge was revoked
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              A malpractice review confirmed a violation after your interview. The badge and its{" "}
              {s.miles > 0 ? s.miles : 250} Miles have been reversed. You can appeal within 7 days.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="btn-ghost btn-sm">
                <ShieldAlert size={13} /> Appeal decision
              </span>
              <span className="chip border-line-strong text-muted">
                <Clock size={12} /> Appeal window closes in 4 days
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------- ineligible */
  if (s.status === "INELIGIBLE") {
    return (
      <section className={clsx("rounded-[22px] border border-line-strong bg-surface", pad)}>
        <Chip tone="muted" dot>
          Not eligible
        </Chip>
        <h2 className={clsx("mt-2 font-semibold", compact ? "text-lg" : "text-xl")}>
          You&apos;re one step away from booking
        </h2>
        <p className="mt-1 text-sm text-muted">
          The interview unlocks once these blockers clear. They&apos;re checked again 24 hours before any slot.
        </p>
        <ul className="mt-4 space-y-2">
          {s.attendancePct < 75 && (
            <li className="flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/5 px-3 py-2.5 text-xs text-warn">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Attendance is {s.attendancePct}% — GRIT eligibility needs 75% or above.
            </li>
          )}
          {s.registrationStatus !== "CLEARED" && (
            <li className="flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/5 px-3 py-2.5 text-xs text-warn">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Semester registration is pending. Clear it with the registrar.
            </li>
          )}
          {s.conductStatus !== "CLEAR" && (
            <li className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2.5 text-xs text-danger">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              Conduct review in progress.
            </li>
          )}
          <li className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-xs text-muted">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent" />
            All {s.skillsTotal} skill levels for {s.trackName} · {s.badgeName} are cleared.
          </li>
        </ul>
      </section>
    );
  }

  /* ----------------------------------------------------------- in progress */
  if (s.status === "IN_PROGRESS") {
    const remaining = s.skillsTotal - s.skillsCleared;
    return (
      <section className={clsx("rounded-[22px] border border-line bg-surface", pad)}>
        <div className="flex items-start gap-4">
          <BadgeMedallion level={s.level} track={s.trackName} state="locked" size={compact ? 64 : 80} />
          <div className="min-w-0 flex-1">
            <Chip tone="muted" dot>
              Interview locked
            </Chip>
            <h2 className={clsx("mt-2 font-semibold", compact ? "text-lg" : "text-xl")}>
              {remaining} skill level{remaining === 1 ? "" : "s"} to go
            </h2>
            <p className="mt-1 text-sm text-muted">
              Clear every required skill for {s.trackName} · {s.badgeName}, then the booking button unlocks.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${(s.skillsCleared / s.skillsTotal) * 100}%` }}
                />
              </div>
              <span className="tabular text-xs text-muted">
                {s.skillsCleared}/{s.skillsTotal}
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* --------------------------------------------------------------- eligible */
  if (s.status === "ELIGIBLE") {
    return (
      <section
        className={clsx(
          "relative overflow-hidden rounded-[22px] border border-accent/25 bg-[radial-gradient(110%_120%_at_100%_0%,rgba(201,247,91,0.12),rgba(11,17,16,0.96))]",
          pad,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-lg">
            <Chip tone="accent" dot>
              You&apos;re eligible
            </Chip>
            <h2 className={clsx("mt-2 font-semibold leading-tight", compact ? "text-lg" : "text-2xl")}>
              Book your Level Clearance Interview
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Every skill for {s.trackName} · {s.badgeName} is cleared. One 30-minute conversation
              stands between you and the badge.
            </p>
          </div>
          <BadgeMedallion level={s.level} track={s.trackName} state="locked" size={compact ? 64 : 84} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>
            <Clock size={12} /> 30 minutes
          </Chip>
          <Chip>
            <Video size={12} /> Google Meet
          </Chip>
          <Chip>
            <Sparkles size={12} /> 1:1 with an interviewer
          </Chip>
          <Chip tone="info">{s.maxAttempts} attempts allowed</Chip>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/student/book" className="btn-primary">
            Choose a slot <ArrowRight size={15} />
          </Link>
          <span className="text-xs text-faint">Slots open for the next 14 days · booking closes 24h before</span>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------- awaiting outcome */
  if (s.status === "AWAITING_OUTCOME") {
    return (
      <section className={clsx("rounded-[22px] border border-info/25 bg-info/[0.05]", pad)}>
        <div className="flex items-start gap-4">
          <BadgeMedallion level={s.level} track={s.trackName} state="pending" size={compact ? 64 : 80} />
          <div className="min-w-0 flex-1">
            <Chip tone="info" dot>
              Awaiting outcome
            </Chip>
            <h2 className={clsx("mt-2 font-semibold", compact ? "text-lg" : "text-xl")}>
              Nice work — your interview is done
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {s.activeInterview?.interviewerName ?? "Your interviewer"} is recording the outcome. It usually lands
              within 24 hours, and we&apos;ll message you the moment it does.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />
                {s.activeInterview ? formatIstDayLong(s.activeInterview.startsAt) : "Today"}
              </span>
              <span>·</span>
              <span>Attempt {s.activeInterview?.attemptNo ?? 1} of {s.maxAttempts}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ----------------------------------------------------------------- booked */
  if (s.status === "BOOKED" && s.activeInterview) {
    const i = s.activeInterview;
    return (
      <section className={clsx("rounded-[22px] border border-line bg-surface", pad)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Chip tone="success" dot>
            Interview booked
          </Chip>
          <span className="chip border-info/30 bg-info/10 text-info">
            <Clock size={12} />
            <Countdown to={i.startsAt.toISOString()} />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-stretch gap-4">
          <div className="flex min-w-[104px] flex-col items-center justify-center rounded-2xl border border-line-strong bg-surface-2 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              {weekdayShort.format(i.startsAt)}
            </span>
            <span className="text-3xl font-semibold leading-none tabular">{dayNum.format(i.startsAt)}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted">{monthShort.format(i.startsAt)}</span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className={clsx("font-semibold leading-tight", compact ? "text-base" : "text-xl")}>
              {s.trackName} · {s.badgeName} interview
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} /> {formatIstTimeRange(i.startsAt, i.endsAt)} IST
              </span>
              <span className="text-faint">·</span>
              <span>with {i.interviewerName}</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-faint">
              <MapPin size={12} /> Google Meet · link opens 10 minutes before
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={i.meetingUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
                <Video size={13} /> Join Google Meet
              </a>
              <Link href={`/student/interviews/${i.id}`} className="btn-ghost btn-sm">
                Interview details <ArrowRight size={12} />
              </Link>
              <span className="chip">
                Attempt {i.attemptNo} of {s.maxAttempts}
              </span>
            </div>
          </div>
        </div>

        {showActions && !compact && (
          <div className="mt-4 border-t border-line pt-3">
            <InterviewActions
              interviewId={i.id}
              canManage={i.startsAt.getTime() - Date.now() >= 24 * 3_600_000}
              startsAtIso={i.startsAt.toISOString()}
              rescheduleCount={i.rescheduleCount}
            />
          </div>
        )}
      </section>
    );
  }

  /* -------------------------------------------------- failed / retake / no-show */
  const isRetake = s.status === "RETAKE_REQUIRED";
  const isNoShow = s.status === "NO_SHOW";
  const tone = isRetake ? "warn" : "danger";
  const toneClasses = isRetake
    ? "border-warn/30 bg-warn/[0.05]"
    : "border-danger/30 bg-danger/[0.05]";

  return (
    <section className={clsx("rounded-[22px] border", toneClasses, pad)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Chip tone={tone} dot>
          {isNoShow ? "Missed interview" : isRetake ? "Retake recommended" : "Not cleared this time"}
        </Chip>
        <span className="text-xs text-faint">Attempt {s.attemptsUsed} of {s.maxAttempts}</span>
      </div>

      <h2 className={clsx("mt-2 font-semibold", compact ? "text-lg" : "text-xl")}>
        {isNoShow
          ? "You missed your slot"
          : isRetake
            ? "You're close — retake recommended"
            : `Not cleared this time, ${s.name.split(" ")[0]}`}
      </h2>

      {s.lastInterview?.outcomeNote && (
        <blockquote className="mt-3 rounded-xl border-l-2 border-line-strong bg-ink/40 px-3.5 py-2.5 text-sm leading-relaxed text-muted">
          “{s.lastInterview.outcomeNote}”
          <footer className="mt-1 text-[11px] text-faint">— {s.lastInterview.interviewerName}</footer>
        </blockquote>
      )}

      {isNoShow && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The interviewer waited 10 minutes. This used one attempt and a 7-day cooldown, but your badge
          isn&apos;t gone — book again when the window opens.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <Attempts used={s.attemptsUsed} max={s.maxAttempts} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {cooling ? (
            <span className={clsx("chip", isRetake ? "border-warn/30 bg-warn/10 text-warn" : "border-danger/30 bg-danger/10 text-danger")}>
              <Lock size={12} />
              Rebooking opens {s.cooldownUntil ? formatIstDayLong(s.cooldownUntil) : "soon"}
            </span>
          ) : (
            <span className="chip border-accent/30 bg-accent/10 text-accent">
              <RotateCcw size={12} /> Retake window open
            </span>
          )}
          <span className="text-faint">
            {cooling && s.cooldownUntil
              ? `That's ${Math.max(1, Math.ceil((s.cooldownUntil.getTime() - Date.now()) / 86_400_000))} days away`
              : "Book your next attempt"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {cooling ? (
          <button disabled className="btn-ghost btn-sm opacity-60">
            <Lock size={13} /> Book retake
          </button>
        ) : (
          <Link href="/student/book" className="btn-primary btn-sm">
            <RotateCcw size={13} /> Book retake
          </Link>
        )}
        <Link href="/student/before-after" className="link text-xs">
          See what changed on your dashboard
        </Link>
      </div>
    </section>
  );
}
