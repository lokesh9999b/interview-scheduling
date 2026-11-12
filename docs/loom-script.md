# Loom walkthrough script (2–3 minutes)

## 0:00–0:20 — The problem

**Show:** Landing page and the persona switcher.
**Say:** “A student can finish every required skill and still be blocked from their badge by an unclear interview process. GRIT makes that last step visible to students, interviewers, and Interview Ops.”

## 0:20–0:45 — Rules and state

**Show:** `/writeup`, state table, then return to the landing page.
**Say:** “The flow is eligibility → booking → outcome. The rules are a 30-minute one-to-one interview, a 24-hour booking cutoff, a 14-day booking horizon, cooldowns after outcomes, and a hard attempt cap. Every implemented transition is recorded.”

## 0:45–1:20 — Student booking

**Show:** Enter as an eligible student; open Book; choose a date and slot; confirm; open the booking details and message.
**Say:** “The student sees only eligible slots. Booking rechecks eligibility on the server and claims the slot transactionally, so simultaneous requests cannot both hold the same slot. The confirmation message includes the local time, interviewer, meeting link, and cancellation rule.”

## 1:20–1:50 — Interviewer flow

**Show:** Switch to Interviewer; show availability, schedule, and the outcome control.
**Say:** “Interviewers publish weekly availability, see their schedule, and record pass, fail, or retake with feedback. That outcome updates the badge state, attempt count, cooldown, and student notification.”

## 1:50–2:15 — Ops and edge cases

**Show:** Interview Ops tracker, export, and malpractice flags.
**Say:** “Ops can see who has not booked, nudge students, and export the tracker. A confirmed malpractice case reverses Miles and Qualiflyer and keeps an audit trail. The active slot lock is released when a booking is cancelled.”

## 2:15–2:40 — Before / after and trade-offs

**Show:** Before/after gallery, then `/writeup`.
**Say:** “The same dashboard components show before, pass, and retake states. This is intentionally a local prototype: persona switching is not production authentication, notifications are in-app only, and scheduled reminders and appeals are not wired to external services.”

## Recording notes

- Keep the seeded demo data visible; do not enter real student details.
- If no slot is available for the selected demo student, switch to another seeded eligible student or use the prepared schedule state.
- The reminder is a message template/demo record, not an automatically scheduled delivery.
- The PostgreSQL provider switch is a local preparation step; production credentials and deployment are intentionally not included.
