import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, FileWarning, Flag, ShieldAlert, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { dismissFlag } from "@/app/actions/admin";
import { formatIstDayLong } from "@/lib/time";
import { Avatar, Card, Chip, Stat } from "@/components/ui";
import { FlagControl } from "@/components/admin/FlagControl";

export const dynamic = "force-dynamic";

export default async function FlagsPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect(homeForRole(user.role));

  const flags = await prisma.malpracticeFlag.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: true, progress: { include: { badge: { include: { track: true } } } } } },
      raisedByUser: true,
    },
  });

  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
      progress: { include: { badge: { include: { track: true } } } },
      interviews: { orderBy: { startsAt: "desc" } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const awarded = students.filter((s) => s.progress[0]?.status === "PASSED");
  const revoked = students.filter((s) => s.progress[0]?.status === "REVOKED");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/students" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-fg">
          <ArrowLeft size={12} /> Back to eligible students
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Malpractice flags</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              A flag raised after the interview nullifies the badge, reverses the Miles, and removes Qualiflyer
              status. The student keeps a 7-day appeal window and every action is written to the audit log.
            </p>
          </div>
          <Chip tone="danger" dot>
            {revoked.length} badge{revoked.length === 1 ? "" : "s"} nullified
          </Chip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Badges awarded" value={awarded.length} hint="this cycle" />
        <Stat label="Nullified" value={revoked.length} hint="post-award" />
        <Stat label="Confirmed flags" value={flags.filter((f) => f.status === "CONFIRMED").length} hint="all time" />
        <Stat label="Appeals open" value={0} hint="7-day window" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-3">
          {flags.length === 0 && (
            <Card className="p-8 text-center">
              <ShieldCheck size={22} className="mx-auto text-accent" />
              <p className="mt-3 text-sm font-semibold">No flags raised</p>
              <p className="mt-1 text-xs text-muted">Badges stay live until a case is confirmed.</p>
            </Card>
          )}

          {flags.map((flag) => {
            const progress = flag.student.progress[0];
            return (
              <Card key={flag.id} className="border-danger/20 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar name={flag.student.user.name} hue={flag.student.user.hue} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{flag.student.user.name}</span>
                      <Chip tone="danger" dot>
                        {flag.status === "CONFIRMED" ? "Badge nullified" : flag.status}
                      </Chip>
                    </div>
                    <div className="mt-0.5 text-[11px] text-faint">
                      {progress?.badge.track.name} · {progress?.badge.name} · {flag.student.user.campus}
                    </div>
                    <blockquote className="mt-2 rounded-lg border-l-2 border-danger/40 bg-danger/[0.05] px-3 py-2 text-[11px] leading-relaxed text-muted">
                      {flag.reason}
                    </blockquote>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-faint">
                      <span>Raised by {flag.raisedByUser?.name ?? "Interview Ops"}</span>
                      <span>·</span>
                      <span>{formatIstDayLong(flag.createdAt)}</span>
                      <span>·</span>
                      <span className="text-danger">Miles reversed</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {flag.status === "OPEN" && (
                      <form action={dismissFlag}>
                        <input type="hidden" name="id" value={flag.id} />
                        <button className="btn-ghost btn-sm">Dismiss</button>
                      </form>
                    )}
                    <Link href="/student/before-after?state=revoked" className="text-[10px] text-faint hover:text-fg">
                      View student view
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-warn" />
              <h2 className="text-xs font-semibold">How a flag moves through the system</h2>
            </div>
            <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted">
              <li><span className="text-fg">1. Raised</span> — evidence is attached to the interview record, badge stays live.</li>
              <li><span className="text-fg">2. Reviewed</span> — Ops confirms or dismisses. Confirmed → badge nullified, Miles reversed.</li>
              <li><span className="text-fg">3. Appeal</span> — student has 7 days. An upheld appeal reinstates the badge and re-credits Miles.</li>
              <li><span className="text-fg">4. Audited</span> — every state change lands in the interview event log.</li>
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-danger" />
              <h2 className="text-xs font-semibold">Raise a flag</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Only badges that are currently awarded can be nullified. The student is notified immediately.
            </p>
            <div className="mt-3 space-y-2">
              {awarded.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
                  <Avatar name={s.user.name} hue={s.user.hue} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium">{s.user.name}</div>
                    <div className="text-[10px] text-faint">{s.progress[0]?.badge.name} · awarded</div>
                  </div>
                  <FlagControl
                    studentProfileId={s.id}
                    studentName={s.user.name}
                    badgeLabel={`${s.progress[0]?.badge.name ?? "Novice"} Badge`}
                  />
                </div>
              ))}
              {awarded.length === 0 && (
                <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-[11px] text-faint">
                  No awarded badges to flag.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck size={14} className="text-accent" />
              <h2 className="text-xs font-semibold">What the student sees</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              The dashboard flips to a nullified state, the credential ID disappears, and the Miles counter drops.
              Their message includes the exact reason and the appeal deadline.
            </p>
            <Link href="/student/before-after?state=revoked" className="btn-ghost btn-sm mt-3">
              <FileWarning size={12} /> Preview the revoked state
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
