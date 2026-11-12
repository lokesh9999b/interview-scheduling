import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  Flag,
  GraduationCap,
  Send,
  UserX,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { switchPersona } from "@/app/actions/auth";
import { formatIstDayLong, formatIstTime } from "@/lib/time";
import { journeyMeta } from "@/lib/state-machine";
import { Avatar, Card, Chip, Stat } from "@/components/ui";
import { NudgeButton } from "@/components/admin/NudgeButton";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "not_booked", label: "Not booked" },
  { key: "booked", label: "Booked" },
  { key: "awaiting", label: "Awaiting outcome" },
  { key: "completed", label: "Completed" },
  { key: "flagged", label: "Flagged" },
];

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect(homeForRole(user.role));

  const params = await searchParams;
  const filter = params.filter ?? "all";

  const students = await prisma.studentProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: true,
      progress: { include: { badge: { include: { track: true } } } },
      interviews: { orderBy: { startsAt: "desc" } },
      nudges: true,
    },
  });

  const rows = students.map((s) => {
    const progress = s.progress[0];
    const active = s.interviews.find((i) => ["BOOKED", "AWAITING_OUTCOME"].includes(i.status)) ?? null;
    const last = s.interviews.find((i) => ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(i.status)) ?? null;
    const status = progress?.status ?? "IN_PROGRESS";
    return {
      id: s.id,
      userId: s.userId,
      name: s.user.name,
      hue: s.user.hue,
      campus: s.user.campus,
      attendance: s.attendancePct,
      progress,
      status,
      active,
      last,
      nudges: s.nudges.length,
      needsNudge: status === "ELIGIBLE" && s.nudges.length === 0,
    };
  });

  const counts = {
    all: rows.length,
    not_booked: rows.filter((r) => r.status === "ELIGIBLE").length,
    booked: rows.filter((r) => r.status === "BOOKED").length,
    awaiting: rows.filter((r) => r.status === "AWAITING_OUTCOME").length,
    completed: rows.filter((r) => ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(r.status)).length,
    flagged: rows.filter((r) => r.status === "REVOKED").length,
  };

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "not_booked") return r.status === "ELIGIBLE";
    if (filter === "booked") return r.status === "BOOKED";
    if (filter === "awaiting") return r.status === "AWAITING_OUTCOME";
    if (filter === "completed") return ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(r.status);
    if (filter === "flagged") return r.status === "REVOKED";
    return true;
  });

  const notBooked = rows.filter((r) => r.status === "ELIGIBLE");
  const eligible = rows.filter((r) => !["IN_PROGRESS", "INELIGIBLE"].includes(r.status));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Chip tone="accent" dot>
              Interview Ops
            </Chip>
            <span className="text-[11px] text-faint">Novice cycle · {formatIstDayLong(new Date())}</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Eligible students</h1>
          <p className="mt-1 text-xs text-muted">
            Who has booked, who hasn&apos;t, and what happened in the room. {notBooked.length} students need a nudge
            today.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/export" className="btn-ghost btn-sm">
            <Download size={13} /> Export CSV
          </a>
          <Link href="/admin/flags" className="btn-primary btn-sm">
            <Flag size={13} /> Malpractice flags
            {counts.flagged > 0 && (
              <span className="rounded-full bg-ink/20 px-1.5 text-[10px] font-bold">{counts.flagged}</span>
            )}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <Stat label="Eligible" value={eligible.length} hint="skills cleared" />
        <Stat label="Booked" value={counts.booked + counts.awaiting} hint="slots in the diary" />
        <Stat label="Not booked" value={counts.not_booked} hint="needs a nudge" />
        <Stat label="Completed" value={counts.completed} hint="outcomes recorded" />
        <Stat label="Flagged" value={counts.flagged} hint="badges nullified" />
      </div>

      {notBooked.length > 0 && (
        <div className="rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Send size={14} className="text-warn" />
            <p className="flex-1 text-[11px] leading-relaxed text-warn">
              <span className="font-semibold">{notBooked.length} eligible students haven&apos;t booked.</span>{" "}
              {notBooked.map((s) => s.name.split(" ")[0]).join(", ")} — nudge them before the cycle closes.
            </p>
            <Link href="/admin/students?filter=not_booked" className="text-[11px] text-warn underline-offset-4 hover:underline">
              Review
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/students" : `/admin/students?filter=${f.key}`}
              className={clsx(
                "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
                active
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line bg-surface-2/50 text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] text-faint">{counts[f.key as keyof typeof counts]}</span>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_1fr_0.9fr_0.8fr_auto] gap-3 border-b border-line px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-faint lg:grid">
          <span>Student</span>
          <span>Badge</span>
          <span>Status</span>
          <span>Interview</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-line/70">
          {filtered.map((r) => {
            const meta = journeyMeta(r.status);
            const interview = r.active ?? r.last;
            return (
              <div
                key={r.id}
                className="grid gap-3 px-4 py-3 lg:grid-cols-[1.6fr_1fr_0.9fr_0.8fr_auto] lg:items-center"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.name} hue={r.hue} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">{r.name}</div>
                    <div className="truncate text-[10px] text-faint">
                      {r.campus} · {r.attendance}% attendance
                      {r.nudges > 0 ? ` · nudged ${r.nudges}×` : ""}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[11px] text-fg">{r.progress?.badge.track.name ?? "—"}</div>
                  <div className="text-[10px] text-faint">{r.progress?.badge.name ?? "—"} · {r.progress?.skillsCleared ?? 0}/{r.progress?.skillsTotal ?? 4} skills</div>
                </div>

                <div>
                  <Chip tone={meta.tone} dot>
                    {meta.label}
                  </Chip>
                </div>

                <div className="text-[10px] text-muted">
                  {interview ? (
                    <>
                      <div className="text-[11px] text-fg">{formatIstDayLong(interview.startsAt)}</div>
                      <div>{formatIstTime(interview.startsAt)} IST</div>
                    </>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 lg:justify-end">
                  {r.status === "ELIGIBLE" && <NudgeButton studentProfileId={r.id} />}
                  {r.status === "PASSED" && (
                    <Link href="/admin/flags" className="btn-ghost btn-sm">
                      <Flag size={11} /> Flag
                    </Link>
                  )}
                  {r.status === "REVOKED" && (
                    <Link href="/admin/flags" className="chip border-danger/30 bg-danger/10 text-danger">
                      <Flag size={10} /> Case
                    </Link>
                  )}
                  <form action={switchPersona}>
                    <input type="hidden" name="userId" value={r.userId} />
                    <input type="hidden" name="redirectTo" value="/student" />
                    <button className="btn-ghost btn-sm">
                      Open <ArrowRight size={11} />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-faint">No students in this filter.</div>
          )}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: <CalendarClock size={15} />,
            title: "Booking window",
            body: "Slots publish 14 days ahead and close 24 hours before. Late changes route to Ops.",
          },
          {
            icon: <UserX size={15} />,
            title: "No-show policy",
            body: "10-minute grace, one attempt used, 7-day cooldown. Ops can reinstate a genuine miss.",
          },
          {
            icon: <CheckCircle2 size={15} />,
            title: "Outcome SLA",
            body: "Interviewers record within 24 hours. Anything older than that shows in the queue.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-line bg-surface/60 px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
              <span className="text-accent/80">{c.icon}</span> {c.title}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{c.body}</p>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[10px] text-faint">
        <GraduationCap size={11} /> {rows.length} students in the Novice cohort · data seeded for the prototype
      </p>
    </div>
  );
}
