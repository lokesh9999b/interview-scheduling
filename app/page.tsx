import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Inbox,
  Layers,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { switchPersona } from "@/app/actions/auth";
import { Avatar, Card, Chip } from "@/components/ui";
import { journeyMeta } from "@/lib/state-machine";
import { formatIstDayLong, formatIstTimeRange } from "@/lib/time";

export const dynamic = "force-dynamic";

const PERSONAS = [
  {
    role: "STUDENT",
    email: "aarav.sharma@niatindia.com",
    label: "Student",
    blurb: "Eligible for Novice, hasn't booked yet.",
    points: ["Book a slot in 3 taps", "See status + result", "Before / after the badge"],
    icon: <CalendarClock size={18} />,
    href: "/student",
  },
  {
    role: "INTERVIEWER",
    email: "rohan.mehta@niatindia.com",
    label: "Interviewer",
    blurb: "6 interviews today, 2 outcomes pending.",
    points: ["Set weekly availability", "Run today's schedule", "Record pass / fail / retake"],
    icon: <ClipboardCheck size={18} />,
    href: "/interviewer/schedule",
  },
  {
    role: "ADMIN",
    email: "ananya.deshpande@niatindia.com",
    label: "Interview Ops",
    blurb: "10 eligible students, 3 haven't booked.",
    points: ["Track booked vs not booked", "Nudge + export", "Handle malpractice flags"],
    icon: <Users size={18} />,
    href: "/admin/students",
  },
];

export default async function LandingPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      studentProfile: { include: { progress: { include: { badge: { include: { track: true } } } } } },
      interviewerProfile: true,
    },
  });

  const students = users.filter((u) => u.role === "STUDENT");
  const personaByEmail = new Map(users.map((u) => [u.email, u]));

  const counts = students.reduce(
    (acc, s) => {
      const status = s.studentProfile?.progress[0]?.status ?? "IN_PROGRESS";
      if (status === "PASSED") acc.awarded++;
      else if (status === "BOOKED") acc.booked++;
      else if (status === "AWAITING_OUTCOME") acc.awaiting++;
      else if (status === "ELIGIBLE") acc.eligible++;
      return acc;
    },
    { eligible: 0, booked: 0, awaiting: 0, awarded: 0 },
  );

  return (
    <div className="space-y-12">
      <section className="rise">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent" dot>
            GRIT 2026–27 · AI Product Engineer, Round 1
          </Chip>
          <Chip tone="muted">Working prototype</Chip>
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
          From eligible to badge,
          <br />
          <span className="text-accent">in one conversation.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Interview scheduling for GRIT Track Badges — students book a Level Clearance Interview,
          interviewers manage availability and record outcomes, and Interview Ops sees exactly who has
          booked and who hasn&apos;t. Every state below is real, not a mock-up.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { label: `${counts.eligible} eligible`, tone: "accent" },
            { label: `${counts.booked} booked`, tone: "info" },
            { label: `${counts.awaiting} awaiting outcome`, tone: "info" },
            { label: `${counts.awarded} badges awarded`, tone: "success" },
          ].map((c) => (
            <Chip key={c.label} tone={c.tone} dot>
              {c.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wide">Pick a side of the flow</h2>
            <p className="mt-0.5 text-xs text-muted">
              No login. Switch personas any time — the cookie keeps the demo state.
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-faint sm:flex">
            <ArrowLeftRight size={12} /> demo accounts
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PERSONAS.map((p) => {
            const user = personaByEmail.get(p.email);
            if (!user) return null;
            return (
              <Card key={p.role} className="flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} hue={user.hue} size={40} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-[11px] text-faint">{p.label}</div>
                  </div>
                  <span className="ml-auto rounded-lg border border-line bg-surface-2 p-2 text-accent">
                    {p.icon}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted">{p.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-[11px] text-muted">
                      <CheckCircle2 size={12} className="text-accent/80" />
                      {point}
                    </li>
                  ))}
                </ul>
                <form action={switchPersona} className="mt-4">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="redirectTo" value={p.href} />
                  <button className="btn-primary btn-sm w-full">
                    Enter as {p.label} <ArrowRight size={13} />
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold tracking-wide">Jump straight to a state</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ten seeded students cover the whole journey — including cooldowns, no-shows and a revoked badge.
          </p>
        </div>
        <Card className="overflow-hidden">
          <div className="divide-y divide-line/70">
            {students.map((s) => {
              const progress = s.studentProfile?.progress[0];
              const meta = journeyMeta(progress?.status ?? "IN_PROGRESS");
              const active = progress?.status === "BOOKED" || progress?.status === "AWAITING_OUTCOME";
              const interview = active
                ? undefined
                : undefined;
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <Avatar name={s.name} hue={s.hue} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{s.name}</div>
                    <div className="text-[11px] text-faint">
                      {progress?.badge.track.name ?? "AI Product Mastery"} · {progress?.badge.name ?? "Novice"} ·{" "}
                      {s.campus}
                    </div>
                  </div>
                  <Chip tone={meta.tone} dot>
                    {meta.label}
                  </Chip>
                  <form action={switchPersona}>
                    <input type="hidden" name="userId" value={s.id} />
                    <input type="hidden" name="redirectTo" value="/student" />
                    <button className="btn-ghost btn-sm">
                      Open <ArrowRight size={12} />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/student/book",
            icon: <CalendarClock size={16} />,
            title: "Booking flow",
            body: "14-day slot picker, race-safe confirm, reschedule and cancel rules.",
          },
          {
            href: "/interviewer/schedule",
            icon: <ClipboardCheck size={16} />,
            title: "Interviewer day",
            body: "Today's schedule, join links, and outcome recording with notes.",
          },
          {
            href: "/student/messages",
            icon: <Inbox size={16} />,
            title: "The 3 messages",
            body: "Confirmation, 24-hour reminder, and the result — exact copy.",
          },
          {
            href: "/student/before-after",
            icon: <Layers size={16} />,
            title: "Before / after",
            body: "Student home before the result, after a pass, and after a retake.",
          },
          {
            href: "/writeup",
            icon: <FileText size={16} />,
            title: "Project write-up",
            body: "Review the state model, operating rules, edge cases, and assumptions.",
          },
        ].map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="h-full p-4 transition hover:border-accent/35 hover:bg-surface-2">
              <div className="flex items-center gap-2 text-accent">{c.icon}</div>
              <div className="mt-3 text-xs font-semibold">{c.title}</div>
              <div className="mt-1 text-[11px] leading-relaxed text-muted">{c.body}</div>
            </Card>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-surface/60 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="rounded-xl border border-line bg-surface-2 p-2.5 text-accent">
            <ShieldAlert size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">The interesting part isn&apos;t the happy path</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              Two students racing for the last slot, an interviewer cancelling a day, a student who
              never books, a pass that gets nullified three weeks later. The state machine and the
              guards behind it are what the prototype is really showing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/students" className="btn-ghost btn-sm">
              <Users size={13} /> Ops tracker
            </Link>
            <Link href="/admin/flags" className="btn-ghost btn-sm">
              <BadgeCheck size={13} /> Malpractice
            </Link>
          </div>
        </div>
      </section>

      <p className="text-center text-[11px] text-faint">
        Seeded relative to {formatIstDayLong(new Date())} · next slot {formatIstTimeRange(new Date(Date.now() + 3_600_000), new Date(Date.now() + 5_400_000))} IST · all data is fake
      </p>
    </div>
  );
}
