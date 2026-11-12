import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, Inbox, Mail, MessageSquare, Smartphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { getSnapshot } from "@/lib/view";
import { addDaysKey, formatIstDayLong, formatIstTime, istDateKey, istToUtc } from "@/lib/time";
import { bookingConfirmed, reminder24h, resultFail, resultPass, resultRetake } from "@/lib/messages";
import { Card, Chip } from "@/components/ui";
import { ResultTabs } from "@/components/student/ResultTabs";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT" || !user.studentProfileId) redirect(homeForRole(user.role));

  const snapshot = await getSnapshot(user.studentProfileId);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { sentAt: "desc" },
    take: 12,
  });

  const anchor =
    snapshot.activeInterview ??
    snapshot.lastInterview ??
    snapshot.interviews[0] ??
    null;

  const startsAt = anchor?.startsAt ?? istToUtc(addDaysKey(istDateKey(), 3), 16 * 60 + 30);
  const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
  const interviewId = anchor?.id ?? "demo";
  const interviewerName = anchor?.interviewerName ?? "Rohan Mehta";
  const meetingUrl = anchor?.meetingUrl ?? "https://meet.google.com/grit-demo";

  const base = {
    studentName: snapshot.name,
    trackName: snapshot.trackName,
    badgeName: snapshot.badgeName,
    interviewerName,
    startsAt,
    endsAt,
    meetingUrl,
    interviewId,
  };

  const confirmed = bookingConfirmed(base);
  const reminder = reminder24h(base);

  const resultBase = {
    studentName: snapshot.name,
    trackName: snapshot.trackName,
    badgeName: snapshot.badgeName,
    interviewerName,
    note: snapshot.lastInterview?.outcomeNote ?? "Strong on UI engineering, but system design fundamentals need work.",
    attemptNo: Math.max(1, snapshot.attemptsUsed),
    maxAttempts: snapshot.maxAttempts,
    credentialId: snapshot.credentialId ?? "GRIT-APM-NOV-2026-0142",
    milesAward: 250,
    retakeDate: snapshot.cooldownUntil ?? new Date(Date.now() + 7 * 86_400_000),
    interviewId,
  };

  const copies = {
    PASS: resultPass(resultBase),
    RETAKE: resultRetake(resultBase),
    FAIL: resultFail(resultBase),
  };

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-fg">
          <ArrowLeft size={12} /> Back to dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
            <p className="mt-1 text-xs text-muted">
              Everything the student sees, in the order they see it. Copy is fixed, not written by AI at send time.
            </p>
          </div>
          <div className="flex gap-2">
            <Chip tone="info" dot>
              {unread} unread
            </Chip>
            <Chip>
              <Smartphone size={11} /> in-app + email
            </Chip>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-accent" />
            <h2 className="text-sm font-semibold">Your inbox</h2>
            <span className="text-[11px] text-faint">{notifications.length} messages</span>
          </div>

          {notifications.length === 0 && (
            <Card className="p-8 text-center">
              <MessageSquare size={20} className="mx-auto text-faint" />
              <p className="mt-2 text-sm font-semibold">No messages yet</p>
              <p className="mt-1 text-xs text-muted">Book an interview and your confirmation lands here instantly.</p>
            </Card>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 ${n.readAt ? "border-line bg-surface/70" : "border-accent/25 bg-accent/[0.04]"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  {n.templateKey.replaceAll("_", " ")}
                </span>
                <span className="ml-auto text-[10px] text-faint">
                  {formatIstDayLong(n.sentAt)} · {formatIstTime(n.sentAt)} IST
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-semibold">{n.title}</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">{n.body}</p>
              {n.ctaHref && n.ctaLabel && (
                <Link href={n.ctaHref} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                  {n.ctaLabel} →
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-info" />
            <h2 className="text-sm font-semibold">The three messages that matter</h2>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Confirmation, reminder, result. Everything else is noise. Real values from this student&apos;s record.
          </p>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Mail size={12} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Message 1 · Booking confirmed
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{confirmed.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">{confirmed.body}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-[10px] text-faint">
              <span>In-app + email</span>
              <span>·</span>
              <span>Sent the moment the slot is claimed</span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info/15 text-info">
                <Bell size={12} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Message 2 · 24-hour reminder
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{reminder.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">{reminder.body}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-[10px] text-faint">
              <span>In-app + email</span>
              <span>·</span>
              <span>Sent 24h before the slot, IST</span>
            </div>
          </div>

          <ResultTabs copies={copies} />

          <Card className="p-4">
            <h3 className="text-[11px] font-semibold">Copy rules</h3>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted">
              <li>• Always IST, always the full date — never &ldquo;tomorrow&rdquo; alone.</li>
              <li>• One next action per message, with the attempt count when it matters.</li>
              <li>• Fail and retake always carry the interviewer&apos;s own words.</li>
              <li>• Never promise a result the system hasn&apos;t recorded yet.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
