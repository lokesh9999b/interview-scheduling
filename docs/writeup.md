# GRIT Level Clearance Interview Scheduling

## 1. Problem and product flow

Students who finish required skills need a clear, fair last step to earn a GRIT track badge. This prototype connects student booking, interviewer operations, outcomes, and badge eligibility to a persisted interview record. The same record drives the student dashboard, interviewer schedule, Interview Ops tracker, audit timeline, and in-app notification.

| Persona | Main task |
| --- | --- |
| Student | Check eligibility, select a slot, manage a booking, and follow the result. |
| Interviewer | Publish availability, run a schedule, and record a reasoned outcome. |
| Interview Ops | Track students, nudge, export, and review malpractice flags. |

## 2. States and transitions

The state model distinguishes eligibility, booking, attendance, outcomes, and post-award review. `CANCELLED_STUDENT` and `CANCELLED_INTERVIEWER` are the persisted status codes.

| State | Entry | Next state / rule |
| --- | --- | --- |
| `SLOT_HELD` | Student selects a slot | `BOOKED` on confirmation; `ELIGIBLE` on hold timeout. Transient design state. |
| `IN_PROGRESS` | Required skill levels are incomplete | `ELIGIBLE` once requirements clear. |
| `ELIGIBLE` | Skills clear and cooldown expires | `BOOKED`; `INELIGIBLE` if policy checks fail. |
| `BOOKED` | Student confirms an open slot | `AWAITING_OUTCOME`, `CANCELLED_STUDENT`, or `CANCELLED_INTERVIEWER`. |
| `AWAITING_OUTCOME` | Interview starts; outcome is pending | `PASSED`, `FAILED`, `RETAKE_REQUIRED`, or `NO_SHOW`. |
| `PASSED` | Interviewer records a pass | Terminal unless malpractice is confirmed. |
| `FAILED` | Interviewer records a fail | `ELIGIBLE` after 14 days; stop self-service at 3 attempts. |
| `RETAKE_REQUIRED` | Interviewer asks the student to return | `ELIGIBLE` after 7 days. |
| `NO_SHOW` | Interviewer marks a no-show after the grace period | `ELIGIBLE` after 7 days; second no-show needs Ops review. |
| `CANCELLED_STUDENT` | Student cancels 24+ hours ahead | `ELIGIBLE`; no attempt consumed. |
| `CANCELLED_INTERVIEWER` | Interviewer cancels / blocks availability | `ELIGIBLE`; no attempt consumed; 48-hour priority rebooking is communicated. |
| `EXPIRED` | Slot passes without a recorded outcome | Ops follow-up to resolve the attendance/outcome. |
| `INELIGIBLE` | Attendance, registration, or conduct guard fails | `ELIGIBLE` if restored; active booking must be reviewed. |
| `REVOKED` | Malpractice is confirmed after award | Appeal upheld may restore `PASSED`, with an audit event. |

Every implemented interview transition writes an `InterviewEvent`. Timed slot holds, automatic expiry, appeal processing, and scheduled jobs are design states, not automated services in this local prototype.

## 3. Rules, assumptions, and edge cases

- One-to-one interviews last 30 minutes, with a 5-minute interviewer buffer. Bookable slots are within 14 days and close 24 hours before start.
- Free student cancellation and rescheduling close at the 24-hour boundary. An interview may be rescheduled at most twice; a badge permits at most three outcome attempts.
- Fail cooldown is 14 days; retake and no-show cooldowns are 7 days. A pass awards the badge, 250 Miles for the seeded Novice badge, and Qualiflyer status.
- All timestamps are stored as UTC. Display uses `Asia/Kolkata` (IST, UTC+5:30; no daylight-saving shift).
- Eligibility is checked server-side for registration, conduct, attendance (75% minimum), cooldown, maximum attempts, and an existing active interview.
- Booking conditionally claims an `OPEN` slot in a transaction. A unique `SlotLock` row prevents two live bookings from owning one slot; on a failed claim, the student must choose another slot.
- Availability edits regenerate future open slots without changing existing bookings. Interviewer time off cancels affected bookings, releases their locks, returns the attempt, and creates a student notification.
- Confirmed malpractice revokes the badge, removes its credential and Qualiflyer status, reverses Miles, and appends an audit event.

Assumptions: one demo badge progress per student view, one interviewer per slot, no payments, and no production identity system. Persona switching is a demo cookie. Notifications are persisted in-app rows; email, WhatsApp, scheduled reminders, waitlist delivery, priority ranking, and appeals are not connected to external services. The seeded accounts and sample data are fictional demo data.

## 4. Data model and integrity

Prisma models: `User`, `StudentProfile`, `InterviewerProfile`, `Track`, `Badge`, `BadgeProgress`, `AvailabilityRule`, `AvailabilityException`, `InterviewSlot`, `SlotLock`, `Interview`, `InterviewEvent`, `Notification`, `MalpracticeFlag`, and `OpsNudge`.

`BadgeProgress` is unique per student and badge. An `Interview` is unique per student, badge, and attempt number. `SlotLock` contains only active bookings and is unique by slot and interview. Events are append-only transition records; notifications retain their template, copy, and read time. SQLite is the local demo provider; PostgreSQL is the intended Vercel provider. The schema avoids provider-specific enums and native types.

## 5. Student messages

The templates below are the fixed copy used by `lib/messages.ts`; names, badge, time, URL, and outcome details are interpolated when a message is created.

### 1 — Booking confirmed

**Title:** `Interview booked — {trackName} · {badgeName}`

> Hi {studentName}, your Level Clearance Interview is confirmed.
>
> {date} · {time range} IST
> <br>Interviewer: {interviewerName}
> Google Meet: {meetingUrl}
>
> Join 5 minutes early with your student ID ready. You can reschedule or cancel up to 24 hours before your slot.

### 2 — 24-hour reminder

**Title:** `Your interview is tomorrow, {time range} IST`

> Quick reminder for your Level Clearance Interview.
>
> {trackName} · {badgeName}
> <br>{date} · {time range} IST
> <br>Interviewer: {interviewerName}
> Google Meet: {meetingUrl}
>
> Have your screen share ready and be online 5 minutes early. Running late? Mark it from your dashboard so your interviewer knows.

### 3 — Result variants

**Pass — title:** `You cleared it — {badgeName} Badge unlocked 🎉`

> Congratulations, {studentName}. You passed your Level Clearance Interview for {trackName} · {badgeName}.
>
> +{milesAward} Miles credited
> <br>Badge added to your profile
> Qualiflyer status unlocked
>
> Your credential ID is {credentialId}. Share it on your profile — your next badge is already waiting.

**Retake — title:** `Retake recommended — available from {date}`

> Your interviewer has asked for a retake rather than a fail. That's a good sign — you're close.
>
> {trackName} · {badgeName}
> <br>Available to rebook: {date}
> Attempt {nextAttempt} of {maxAttempts}
>
> {optional focus area}
> Book as soon as the window opens — slots for that week go live 7 days ahead.

**Fail — title:** `Interview result: not cleared this time`

> Hi {studentName}, you didn't clear the {badgeName} Level Clearance Interview for {trackName}.
>
> {optional interviewer feedback}
>
> You can book a retake from {cooldown date} (attempt {nextAttempt} of {maxAttempts}). Use the time before then on the skill your interviewer flagged — it's the one that will move the needle.

The reminder template is shown in the message gallery and seeded as demo data; no production scheduler or external delivery is configured.

## 6. Before / after

| Surface | Before | After pass | After fail / retake |
| --- | --- | --- | --- |
| Student home | Badge locked; book interview | Badge earned; +250 Miles; Qualiflyer | Cooldown and next attempt |
| Track / credential | Interview pending | Awarded with credential ID | Locked until eligible |
| Leaderboard projection | Not listed | Qualiflyer row | Pre-Qualiflyer |
| Interview Ops | Booked / not booked | Completed · passed | In cooldown |
| Interviewer schedule | Appointment | Completed · outcome | Completed · outcome |

The `/student/before-after` gallery uses the same dashboard components with representative snapshots. Its leaderboard rank is illustrative, not connected to a live leaderboard.

## 7. Architecture and local run

- Next.js App Router, TypeScript, Tailwind CSS, Lucide icons, Prisma, and SQLite for local demo data.
- Server Actions handle booking, cancellation/rescheduling, availability, outcomes, and Ops actions; role checks are performed server-side.
- `InterviewEvent` and `Notification` records make outcomes observable across personas.
- No real authentication, email, WhatsApp, or external meeting integration. Meet links are demo URLs.

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

Use the persona switcher at `/`. PostgreSQL setup: run `npm run db:postgres`, set `DATABASE_URL` to the database connection string, then run `npm run db:push` and `npm run db:seed`. Return to local mode with `npm run db:sqlite` and `DATABASE_URL="file:./dev.db"`.
