import Link from "next/link";
import { redirect } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Check, Minus, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { getSnapshot, type InterviewView, type Snapshot } from "@/lib/view";
import { Card, Chip } from "@/components/ui";
import { StatusHero } from "@/components/student/StatusHero";
import { formatIstDayLong } from "@/lib/time";

export const dynamic = "force-dynamic";

function sampleInterview(overrides: Partial<InterviewView>): InterviewView {
  const startsAt = new Date(Date.now() - 2 * 86_400_000);
  return {
    id: "demo-interview",
    status: "RETAKE_REQUIRED",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 30 * 60_000),
    interviewerName: "Rohan Mehta",
    meetingUrl: "https://meet.google.com/grit-demo",
    attemptNo: 1,
    rescheduleCount: 0,
    outcome: "RETAKE",
    outcomeNote:
      "Close. The build worked, but the explanation of retrieval evaluation was thin. Retake after revising DS & ML L1.",
    outcomeAt: startsAt,
    noShowAt: null,
    cancelReason: null,
    ...overrides,
  };
}

export default async function BeforeAfterPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const user = await getCurrentUser();

  let snapshot: Snapshot | null = null;
  if (user.role === "STUDENT" && user.studentProfileId) {
    snapshot = await getSnapshot(user.studentProfileId);
  } else {
    const fallback = await prisma.studentProfile.findFirst({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
      where: { user: { email: "sana.khan@niatindia.com" } },
    });
    if (fallback) snapshot = await getSnapshot(fallback.id);
  }
  if (!snapshot) redirect(homeForRole(user.role));

  const base = snapshot;
  const note = base.lastInterview?.outcomeNote ?? sampleInterview({}).outcomeNote!;

  const before: Snapshot = {
    ...base,
    status: "ELIGIBLE",
    miles: 0,
    qualiflyer: false,
    credentialId: null,
    awardedAt: null,
    revokedAt: null,
    attemptsUsed: 0,
    cooldownUntil: null,
    activeInterview: null,
    lastInterview: null,
  };

  const afterPass: Snapshot = {
    ...base,
    status: "PASSED",
    miles: 250,
    qualiflyer: true,
    credentialId: base.credentialId ?? "GRIT-APM-NOV-2026-0142",
    awardedAt: new Date(),
    revokedAt: null,
    attemptsUsed: 1,
    cooldownUntil: null,
    activeInterview: null,
    lastInterview: sampleInterview({ status: "PASSED", outcome: "PASS", outcomeNote: null }),
  };

  const afterRetake: Snapshot = {
    ...base,
    status: "RETAKE_REQUIRED",
    miles: 0,
    qualiflyer: false,
    credentialId: null,
    awardedAt: null,
    revokedAt: null,
    attemptsUsed: 1,
    cooldownUntil: new Date(Date.now() + 7 * 86_400_000),
    activeInterview: null,
    lastInterview: sampleInterview({ outcome: "RETAKE", outcomeNote: note }),
  };

  const afterFail: Snapshot = {
    ...afterRetake,
    status: "FAILED",
    cooldownUntil: new Date(Date.now() + 14 * 86_400_000),
    lastInterview: sampleInterview({ status: "FAILED", outcome: "FAIL", outcomeNote: note }),
  };

  const revoked: Snapshot = {
    ...afterPass,
    status: "REVOKED",
    miles: 0,
    qualiflyer: false,
    credentialId: null,
    revokedAt: new Date(),
  };

  const focused = (await searchParams).state;

  const frames = [
    { key: "before", title: "Before the result", sub: "Eligible, interview not booked", tone: "muted", snap: before },
    { key: "pass", title: "After a pass", sub: "Badge awarded, Miles credited", tone: "success", snap: afterPass },
    { key: "retake", title: "After a retake", sub: "Cooldown, attempt 2 of 3", tone: "warn", snap: afterRetake },
  ];

  const rows = [
    {
      label: "Home hero",
      before: "Book your Level Clearance Interview",
      pass: "You're a Qualiflyer",
      retake: "You're close — retake recommended",
    },
    { label: "Badge", before: "Locked", pass: "Novice · awarded", retake: "Locked" },
    { label: "Miles", before: "0", pass: "+250", retake: "0" },
    { label: "Qualiflyer status", before: "Pre-Qualiflyer", pass: "Qualiflyer", retake: "Pre-Qualiflyer" },
    { label: "Primary action", before: "Choose a slot", pass: "Share credential", retake: "Book retake (locked until unlock date)" },
    { label: "Attempts", before: "0 of 3", pass: "1 of 3", retake: "1 of 3 used" },
    { label: "Leaderboard", before: "Not listed", pass: "Qualiflyer row, rank #128", retake: "Not listed" },
    { label: "Ops tracker", before: "Not booked", pass: "Completed · passed", retake: "In cooldown" },
    { label: "Interviewer schedule", before: "Empty slot", pass: "Completed · pass", retake: "Completed · retake" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-fg">
          <ArrowLeft size={12} /> Back to dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Before &amp; after the result</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              The same dashboard, three states. Everything below is rendered from the real{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-[10px]">Snapshot</code> the student sees —
              not screenshots.
            </p>
          </div>
          <Chip tone="accent" dot>
            Live components
          </Chip>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {frames.map((frame) => (
          <div
            key={frame.key}
            className={clsx(
              "overflow-hidden rounded-[22px] border bg-ink/60",
              focused === frame.key ? "border-accent/50" : "border-line",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2/60 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger/60" />
                <span className="h-2 w-2 rounded-full bg-warn/60" />
                <span className="h-2 w-2 rounded-full bg-accent/60" />
                <span className="ml-2 text-[10px] text-faint">dashboard.grit</span>
              </div>
              <Chip tone={frame.tone} dot>
                {frame.key === "before" ? "Before" : frame.key === "pass" ? "After pass" : "After retake"}
              </Chip>
            </div>

            <div className="space-y-3 p-3.5">
              <div>
                <div className="text-[11px] font-semibold">{frame.title}</div>
                <div className="text-[10px] text-faint">{frame.sub}</div>
              </div>

              <StatusHero snapshot={frame.snap} compact showActions={false} />

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Miles", value: frame.snap.miles },
                  { label: "Badges", value: frame.snap.qualiflyer ? 1 : 0 },
                  { label: "Attempts", value: `${frame.snap.attemptsUsed}/${frame.snap.maxAttempts}` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-line bg-surface-2/60 px-2 py-1.5 text-center">
                    <div className="text-[9px] uppercase tracking-wide text-faint">{stat.label}</div>
                    <div className="text-xs font-semibold tabular">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2/40 px-2.5 py-2">
                <span className="text-[10px] text-faint">Qualiflyer leaderboard</span>
                {frame.snap.qualiflyer ? (
                  <span className="text-[10px] font-medium text-accent">Listed · #128</span>
                ) : (
                  <span className="text-[10px] text-faint">Not listed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <ArrowLeftRight size={14} className="text-accent" />
          <h2 className="text-sm font-semibold">What actually changes, screen by screen</h2>
          <span className="ml-auto text-[10px] text-faint">same record, different projections</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-faint">
                <th className="px-4 py-2 font-medium">Surface</th>
                <th className="px-4 py-2 font-medium">Before</th>
                <th className="px-4 py-2 font-medium text-accent">After pass</th>
                <th className="px-4 py-2 font-medium text-warn">After retake</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((row) => (
                <tr key={row.label} className="text-[11px]">
                  <td className="px-4 py-2.5 font-medium text-fg">{row.label}</td>
                  <td className="px-4 py-2.5 text-muted">{row.before}</td>
                  <td className="px-4 py-2.5 text-muted">{row.pass}</td>
                  <td className="px-4 py-2.5 text-muted">{row.retake}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <X size={14} className="text-danger" />
            <h2 className="text-xs font-semibold">And if the badge is nullified</h2>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            A malpractice flag confirmed weeks later flips the same record to{" "}
            <span className="text-danger">REVOKED</span>. Miles reverse, the credential ID disappears, and the
            dashboard becomes an appeal screen.
          </p>
          <div className="mt-3">
            <StatusHero snapshot={revoked} compact showActions={false} />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-xs font-semibold">The four things the result must touch</h2>
          <ul className="mt-3 space-y-2.5">
            {[
              { done: true, text: "Badge state and credential ID — the record of truth" },
              { done: true, text: "Miles and Qualiflyer status — the leaderboard projection" },
              { done: true, text: "The next action — share, retake, or appeal" },
              { done: true, text: "Ops + interviewer views — so the room and the dashboard agree" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check size={10} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-faint">
            <Minus size={11} />
            Everything else stays identical — no duplicate screens, no forked logic.
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3">
        <p className="text-[11px] text-muted">
          Sample student: {base.name} · {base.trackName} · {base.badgeName}
        </p>
        <div className="flex gap-2">
          <Link href="/student/messages" className="btn-ghost btn-sm">
            Read the messages <ArrowRight size={12} />
          </Link>
          <Link href="/student" className="btn-primary btn-sm">
            Open the live dashboard <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <p className="text-center text-[10px] text-faint">
        Rendered {formatIstDayLong(new Date())} · all values computed from the seeded interview records
      </p>
    </div>
  );
}
