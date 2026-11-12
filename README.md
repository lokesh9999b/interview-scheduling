# GRIT Interview Scheduling

A prototype for the **AI Product Engineer — Round 1** assignment. It models the final Level Clearance Interview that a student books after completing the skills required for a GRIT track badge.

The prototype connects three personas to the same persisted interview data:

- **Student:** check eligibility, browse and book a slot, view interview details and results, and read in-app messages.
- **Interviewer:** publish weekly availability, manage time off, view the daily schedule, and record pass, fail, retake, or no-show outcomes.
- **Interview Ops:** track students who have and have not booked, send an in-app nudge, export the tracker, and review malpractice flags.

This is a fictional-data demo, not a production scheduling or identity system.

## Run locally

Requirements: Node.js and npm.

```powershell
npm install
Copy-Item .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a demo persona. To reset and reseed the local SQLite database:

```powershell
npm run db:reset
```

> **Warning:** `db:reset` deletes and recreates the local database. Use it only when you are comfortable losing local demo changes.

## Assignment deliverables

| Requirement | Where to find it |
| --- | --- |
| Interview journey states and transitions | [State model](#states-and-transitions) |
| Edge cases, assumptions, and data model | [Product rules and edge cases](#product-rules-and-edge-cases), [Data model](#data-model) |
| Working student, interviewer, and ops screens | Routes in [Prototype walkthrough](#prototype-walkthrough) |
| Three student messages, with exact template copy | [Student messages](#student-messages) |
| Before-and-after screens | `/student/before-after` and [Before / after behavior](#before-and-after-behavior) |
| Loom explanation | [Loom walkthrough script](docs/loom-script.md) |
| Two-page project write-up | [Markdown write-up](docs/writeup.md), [PDF write-up](docs/writeup.pdf), or the in-app `/writeup` page |

## States and transitions

The data model separates a student's badge progress from each interview's status. The table below describes the journey across those records. `CANCELLED_STUDENT` and `CANCELLED_INTERVIEWER` are the actual persisted interview status values.

| State | Entry | Transition or rule |
| --- | --- | --- |
| `IN_PROGRESS` | One or more required skills are incomplete | Becomes `ELIGIBLE` when requirements are cleared. |
| `ELIGIBLE` | Skills are cleared and no blocking eligibility/cooldown condition remains | Books an interview; can become `INELIGIBLE` if policy checks fail. |
| `BOOKED` | Student confirms an open slot | Becomes `AWAITING_OUTCOME`, `CANCELLED_STUDENT`, or `CANCELLED_INTERVIEWER`. |
| `AWAITING_OUTCOME` | Interview starts and awaits the interviewer's decision | Becomes `PASSED`, `FAILED`, `RETAKE_REQUIRED`, or `NO_SHOW`. |
| `PASSED` | Interviewer records a pass | Badge, credential, Miles, and Qualiflyer status are awarded. A later confirmed malpractice flag can set progress to `REVOKED`. |
| `FAILED` | Interviewer records a fail | Sets a 14-day cooldown; a third outcome attempt reaches the configured attempt cap. |
| `RETAKE_REQUIRED` | Interviewer recommends a retake | Sets a 7-day cooldown. |
| `NO_SHOW` | Interviewer records a no-show after the grace period | Sets a 7-day cooldown. |
| `CANCELLED_STUDENT` | Student cancels at least 24 hours before start | Releases the slot; does not consume an attempt. |
| `CANCELLED_INTERVIEWER` | Interviewer marks time off for a booked day | Releases/blocks the slot, notifies the student, and does not consume an attempt. The notification describes a 48-hour priority rebooking window. |
| `INELIGIBLE` | Attendance, registration, or conduct check fails | Booking is blocked until eligibility is restored. |
| `REVOKED` | Interview Ops confirms malpractice after an award | Removes the badge credential and reverses the award; appeal processing is not implemented. |
| `EXPIRED` | Reserved in the status model for unresolved past interviews | Requires ops follow-up; no automatic expiry job is implemented. |
| `SLOT_HELD` | Student selects a slot in the booking UI | **UI-only countdown:** currently does not reserve the slot in the database. Booking itself is claimed transactionally on confirmation. |

Implemented interview transitions are recorded in `InterviewEvent` so the student detail page can show an audit timeline.

## Product rules and edge cases

- **Scheduling:** 30-minute interviews, a 5-minute interviewer buffer, a 14-day booking horizon, and a 24-hour booking cutoff. All stored timestamps are UTC; displayed times use IST (`Asia/Kolkata`).
- **Eligibility:** the server checks cleared registration, clear conduct status, at least 75% attendance, badge progress, cooldown, maximum attempts, and an existing active interview.
- **Rescheduling:** free up to 24 hours before the interview, at most twice. The count is derived from reschedule events. Same-slot rescheduling is rejected.
- **Attempts and cooldowns:** up to three interview attempts; a fail has a 14-day cooldown, a retake recommendation has a 7-day cooldown, and a no-show has a 7-day cooldown.
- **Concurrent slot booking:** confirmation conditionally changes an `OPEN` slot inside a database transaction and creates a unique `SlotLock`. A losing request receives an error instead of double-booking the slot.
- **Availability changes:** regenerating availability preserves booked/blocked future slots. Interviewer time off cancels affected bookings, releases their locks, notifies students, and returns their attempt.
- **Outcomes:** only the assigned interviewer or Interview Ops may record an outcome; closed interviews cannot be recorded again through the normal action.
- **Post-award malpractice:** confirming a flag revokes the badge/credential, reverses Miles and Qualiflyer, and writes an event.

### Assumptions and prototype limitations

- One interviewer per slot; the demo shows one badge-progress record per student.
- Persona switching uses a demo cookie, **not real authentication or authorization for production**.
- Meeting URLs and seeded users are fictional demo data.
- Notifications are in-app database records only. The reminder template is shown in the message gallery/seed data; there is no reminder scheduler or external email/WhatsApp delivery.
- The booking UI's 10-minute countdown is illustrative, not a server-enforced hold. There is no booking idempotency key.
- Waitlist delivery, priority ranking, automatic expiry, second-no-show ops escalation, appeals, and real leaderboard integration are not implemented.

## Data model

The Prisma schema currently defines these models:

| Model | Purpose / important fields |
| --- | --- |
| `User` | Demo identity, unique email, role, campus, cohort. |
| `StudentProfile` | Attendance, registration/conduct status, Miles, Qualiflyer timestamp. |
| `InterviewerProfile` | Time zone, meeting base URL, slot/buffer length, daily cap. |
| `Track` | Track name, unique slug, description. |
| `Badge` | Track/level, required skill labels, award Miles, cooldowns, attempt limit. |
| `BadgeProgress` | Student/badge status, skills, attempts, cooldown, credential and award/revocation dates. |
| `AvailabilityRule` | Interviewer's weekly weekday/time windows. |
| `AvailabilityException` | Dated availability exception or time off. |
| `InterviewSlot` | Interviewer, UTC start/end, availability status, and source rule. |
| `SlotLock` | Unique lock for a currently active booking; deleted when a booking is released. |
| `Interview` | Student, badge, slot, interviewer, attempt, status, outcome, notes, meeting URL. |
| `InterviewEvent` | Append-style record of state changes, actor, reason, and timestamp. |
| `Notification` | In-app message template, copy, recipient, call to action, and read time. |
| `MalpracticeFlag` | Student, interview, reason, status, and resolution time. |
| `OpsNudge` | Ops nudge recipient, sender, channel, and timestamp. |

Roles, statuses, and outcomes are strings rather than database enums. Required skills are stored as a serialized string; the application parses them as a list.

## Student messages

The app interpolates the bracketed values at send time. These are the exact title/body templates from `lib/messages.ts`.

### 1. Booking confirmation

**Title:** `Interview booked — {trackName} · {badgeName}`

```text
Hi {studentName}, your Level Clearance Interview is confirmed.

{date} · {time range} IST
Interviewer: {interviewerName}
Google Meet: {meetingUrl}

Join 5 minutes early with your student ID ready. You can reschedule or cancel up to 24 hours before your slot.
```

### 2. 24-hour reminder

**Title:** `Your interview is tomorrow, {time range} IST`

```text
Quick reminder for your Level Clearance Interview.

{trackName} · {badgeName}
{date} · {time range} IST
Interviewer: {interviewerName}
Google Meet: {meetingUrl}

Have your screen share ready and be online 5 minutes early. Running late? Mark it from your dashboard so your interviewer knows.
```

### 3. Result — pass

**Title:** `You cleared it — {badgeName} Badge unlocked 🎉`

```text
Congratulations, {studentName}. You passed your Level Clearance Interview for {trackName} · {badgeName}.

+{milesAward} Miles credited
Badge added to your profile
Qualiflyer status unlocked

Your credential ID is {credentialId}. Share it on your profile — your next badge is already waiting.
```

**Result — retake**

**Title:** `Retake recommended — available from {date}`

```text
Your interviewer has asked for a retake rather than a fail. That's a good sign — you're close.

{trackName} · {badgeName}
Available to rebook: {date}
Attempt {nextAttempt} of {maxAttempts}

{optional focus area}
Book as soon as the window opens — slots for that week go live 7 days ahead.
```

**Result — fail**

**Title:** `Interview result: not cleared this time`

```text
Hi {studentName}, you didn't clear the {badgeName} Level Clearance Interview for {trackName}.

{optional interviewer feedback}

You can book a retake from {cooldown date} (attempt {nextAttempt} of {maxAttempts}). Use the time before then on the skill your interviewer flagged — it's the one that will move the needle.
```

The assignment's third message is the result notification, with pass, retake, and fail variants.

## Before-and-after behavior

The `/student/before-after` page renders the student status component for representative before, pass, and retake states, and shows a comparison table. It also describes the revoked state. The leaderboard rank shown in the gallery is illustrative and not live data.

| Surface | Before result | After pass | After fail / retake |
| --- | --- | --- | --- |
| Student home | Eligible; badge locked; book interview | Badge awarded; +250 Miles; Qualiflyer; credential | Feedback and cooldown; attempt count shown |
| Badge / credential | Locked; no credential | Awarded with credential ID | Locked until eligible again |
| Leaderboard projection | Not listed | Qualiflyer row (illustrative) | Not listed |
| Interview Ops tracker | Not booked / booked | Completed — passed | Completed; cooldown |
| Interviewer schedule | Appointment scheduled | Completed with pass | Completed with fail / retake |

## Prototype walkthrough

- `/` — persona switcher and seeded journey states.
- `/student` — student dashboard, badge progress, interview status, and history.
- `/student/book` — date strip, slot selection, and booking confirmation.
- `/student/interviews/{id}` — appointment details and interview event timeline.
- `/student/messages` — in-app messages and message templates.
- `/student/before-after` — before/after state gallery.
- `/interviewer/schedule` — daily schedule and outcome controls.
- `/interviewer/availability` — weekly availability and time off.
- `/admin/students` — eligible student tracker and CSV export.
- `/admin/flags` — malpractice flag and badge-revocation views.
- `/writeup` — in-app project write-up with Markdown/PDF download links.

## Tech and database

Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, and SQLite for the local demo. The Prisma schema is intended to support a PostgreSQL deployment by changing the datasource provider.

To switch the schema provider:

```powershell
npm run db:postgres
# Set DATABASE_URL to a PostgreSQL connection string, then:
npm run db:push
npm run db:seed
```

Switch back to SQLite with `npm run db:sqlite` and set `DATABASE_URL="file:./dev.db"` in `.env`. Database credentials and production deployment configuration are not included.

## Assignment write-up and recording

- [Two-page write-up PDF](docs/writeup.pdf)
- [Full Markdown write-up](docs/writeup.md)
- [Loom walkthrough script and shot list](docs/loom-script.md)

The Loom recording itself must be recorded and submitted separately.
