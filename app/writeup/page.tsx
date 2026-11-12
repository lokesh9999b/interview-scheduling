import Link from "next/link";
import { ArrowDownToLine, FileText } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { Card, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

const states = [
  ["SLOT_HELD", "Student selects a slot; expires after 10 minutes."],
  ["SKILLS_IN_PROGRESS", "Required skill levels are not yet cleared."],
  ["ELIGIBLE", "Skills and student eligibility checks pass."],
  ["BOOKED", "Student confirms an open slot."],
  ["AWAITING_OUTCOME", "Interview has started; outcome is pending."],
  ["PASSED", "Pass recorded; badge, Miles, and Qualiflyer granted."],
  ["FAILED", "Fail recorded; 14-day cooldown."],
  ["RETAKE_REQUIRED", "Retake recommended; 7-day cooldown."],
  ["NO_SHOW", "Interviewer marks no-show after the 10-minute grace period."],
  ["CANCELLED_BY_STUDENT", "Student cancels at least 24 hours ahead; no attempt used."],
  ["CANCELLED_BY_INTERVIEWER", "Interviewer cancels; no attempt used and 48-hour priority window."],
  ["EXPIRED", "Slot passed without an outcome; requires ops follow-up."],
  ["INELIGIBLE", "Registration, attendance, or conduct guard blocks booking."],
  ["REVOKED", "Confirmed malpractice reverses the award; appeal can restore it."],
];

export default function WriteupPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-6 print:max-w-none print:space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Chip tone="accent" dot>GRIT · Product prototype</Chip>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Level Clearance Interview Scheduling</h1>
          <p className="mt-1 text-sm text-muted">Design rationale, state model, operating rules, and prototype boundaries.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <a href="/writeup/markdown" className="btn-ghost btn-sm"><FileText size={13} /> Markdown</a>
          <a href="/writeup/pdf" className="btn-primary btn-sm"><ArrowDownToLine size={13} /> PDF</a>
        </div>
      </header>

      <Card className="p-5 print:break-inside-avoid">
        <h2 className="text-base font-semibold">Problem and design</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Students who clear the required skills still need a reliable final interview step to earn a GRIT track badge.
          The prototype connects student booking, interviewer operations, outcomes, and badge eligibility to one
          auditable interview record. The same record drives all three personas, so a recorded result changes the
          student dashboard, ops tracker, interviewer schedule, and in-app notification together.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-2/60 p-3"><p className="label">Student</p><p className="mt-1 text-xs text-muted">Check eligibility, find a slot, manage a booking, and follow the result.</p></div>
          <div className="rounded-xl border border-line bg-surface-2/60 p-3"><p className="label">Interviewer</p><p className="mt-1 text-xs text-muted">Publish weekly availability, run a schedule, and record a reasoned outcome.</p></div>
          <div className="rounded-xl border border-line bg-surface-2/60 p-3"><p className="label">Interview Ops</p><p className="mt-1 text-xs text-muted">Track eligible students, nudge, export, and review malpractice flags.</p></div>
        </div>
      </Card>

      <Card className="p-5 print:break-inside-avoid">
        <h2 className="text-base font-semibold">Rules and state transitions</h2>
        <p className="mt-1 text-xs text-muted">30-minute 1:1 interview, 5-minute buffer, 14-day booking horizon, 24-hour cutoff; free cancel/reschedule outside the cutoff, up to 2 reschedules and 3 attempts.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {states.map(([state, description]) => (
            <div key={state} className="rounded-lg border border-line/80 px-3 py-2">
              <p className="text-[11px] font-semibold text-fg">{state.replaceAll("_", " ")}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Each transition writes an InterviewEvent. Outcomes increase the attempt count; student and interviewer
          cancellations do not. A pass awards 250 Miles and Qualiflyer; confirmed malpractice revokes the badge,
          reverses the award, and records the reason.
        </p>
      </Card>

      <Card className="p-5 print:break-inside-avoid">
        <h2 className="text-base font-semibold">Data model and integrity</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The provider-agnostic Prisma model contains User, StudentProfile, InterviewerProfile, Track, Badge,
          BadgeProgress, AvailabilityRule, AvailabilityException, InterviewSlot, SlotLock, Interview,
          InterviewEvent, Notification, MalpracticeFlag, and OpsNudge. A unique SlotLock exists only while a slot
          is actively booked. Booking uses a conditional OPEN-slot update inside a transaction; if another booking
          wins the race, the transaction rolls back and the student is asked to choose again.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="rounded-lg border border-line px-3 py-2 text-xs text-muted">UTC timestamps; all dates and times presented in Asia/Kolkata.</p>
          <p className="rounded-lg border border-line px-3 py-2 text-xs text-muted">Availability edits replace only future open inventory; active bookings are handled explicitly.</p>
          <p className="rounded-lg border border-line px-3 py-2 text-xs text-muted">Booking checks registration, conduct, attendance, cooldown, attempt limit, and active-booking status on the server.</p>
          <p className="rounded-lg border border-line px-3 py-2 text-xs text-muted">SQLite is the local demo provider; Postgres is the deployment target. No external auth or messaging provider is wired.</p>
        </div>
      </Card>

      <Card className="p-5 print:break-inside-avoid">
        <h2 className="text-base font-semibold">Edge cases and assumptions</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {[
            "Concurrent booking of the last slot is guarded transactionally.",
            "Duplicate active bookings and past / cutoff slots are rejected server-side.",
            "Rescheduling the same slot, exceeding the reschedule cap, and stale active bookings are rejected.",
            "A cancellation releases its slot lock and does not consume an attempt.",
            "Interviewer time off cancels affected bookings, notifies students, and returns their attempts.",
            "Fail and retake results apply separate cooldowns; attempts cap at three.",
            "Outcome recording is limited to the assigned interviewer or Interview Ops.",
            "Confirmed malpractice reverses the award and records an audit event.",
          ].map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted"><span className="text-accent">•</span>{item}</li>)}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Assumptions: one student badge track is shown per demo account, one interviewer owns each slot, no payments,
          and persona switching is a demo cookie rather than real authentication. Notifications are persisted and
          rendered in-app; email, WhatsApp, scheduled reminders, appeals, and priority ranking are not connected to
          production services. The seeded data is for demonstration, not real student records.
        </p>
      </Card>

      <Card className="p-5 print:break-inside-avoid">
        <h2 className="text-base font-semibold">The three student messages</h2>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted">
          <div><p className="font-semibold text-fg">1 · Booking confirmed</p><p className="mt-1">Confirms badge, date/time in IST, interviewer, Meet link, and the 24-hour change cutoff; asks the student to join 5 minutes early.</p></div>
          <div><p className="font-semibold text-fg">2 · 24-hour reminder</p><p className="mt-1">Repeats the appointment details, asks the student to prepare screen sharing and join early, and points to the dashboard if they are running late. The prototype displays this template but does not run a scheduler.</p></div>
          <div><p className="font-semibold text-fg">3 · Result</p><p className="mt-1">Pass: badge unlocked, Miles credited, Qualiflyer unlocked, credential ID. Retake: next available date and attempt count. Fail: cooldown date, attempt count, and interviewer feedback.</p></div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
          See the complete message copy, transition table, and detailed trade-offs in the downloadable Markdown.
        </p>
      </Card>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-faint print:hidden">
        <span>Local demo · seeded data · no real authentication or outbound messages</span>
        <Link href="/" className="link">Return to persona switcher</Link>
      </footer>
    </article>
  );
}
