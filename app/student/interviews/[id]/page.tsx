import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock3, Video } from "lucide-react";
import { InterviewActions } from "@/components/student/InterviewActions";
import { Card, Chip } from "@/components/ui";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { interviewStatusMeta } from "@/lib/state-machine";
import { formatIstDayLong, formatIstTimeRange, formatIstTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT" || !user.studentProfileId) redirect(homeForRole(user.role));

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, studentId: user.studentProfileId },
    include: {
      badge: { include: { track: true } },
      interviewer: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!interview) notFound();

  const status = interviewStatusMeta(interview.status);
  const canManage = interview.status === "BOOKED" && interview.startsAt.getTime() - Date.now() >= 24 * 3_600_000;
  const rescheduleCount = interview.events.filter(
    (event) => event.fromState === "BOOKED" && event.toState === "BOOKED",
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/student" className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-fg">
          <ArrowLeft size={12} /> Back to dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">{interview.badge.track.name}</Chip>
          <Chip>{interview.badge.name} Badge</Chip>
          <Chip tone={status.tone} dot>{status.label}</Chip>
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Interview details</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="label">Scheduled for</p>
                <p className="mt-1 text-lg font-semibold">{formatIstDayLong(interview.startsAt)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Clock3 size={14} /> {formatIstTimeRange(interview.startsAt, interview.endsAt)} IST
                </p>
              </div>
              <Chip tone="info">Attempt {interview.attemptNo} of {interview.badge.maxAttempts}</Chip>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-medium">{interview.interviewer.name}</p>
              <p className="text-xs text-muted">{interview.interviewer.email}</p>
            </div>
            {["BOOKED", "AWAITING_OUTCOME"].includes(interview.status) && (
              <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm mt-4">
                <Video size={13} /> Join Google Meet
              </a>
            )}
            {interview.outcome && (
              <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3">
                <p className="label">Result · {interview.outcome}</p>
                {interview.outcomeNote && <p className="mt-1 text-sm leading-relaxed text-muted">{interview.outcomeNote}</p>}
                {interview.outcomeAt && (
                  <p className="mt-2 text-[10px] text-faint">
                    Recorded {formatIstDayLong(interview.outcomeAt)} at {formatIstTime(interview.outcomeAt)} IST
                  </p>
                )}
              </div>
            )}
            {interview.cancelReason && (
              <p className="mt-4 rounded-lg border border-warn/20 bg-warn/[0.05] px-3 py-2 text-xs text-muted">
                {interview.cancelReason}
              </p>
            )}
          </Card>

          {interview.status === "BOOKED" && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock size={14} className="text-accent" />
                <h2 className="text-sm font-semibold">Need to make a change?</h2>
              </div>
              <InterviewActions
                interviewId={interview.id}
                canManage={canManage}
                startsAtIso={interview.startsAt.toISOString()}
                rescheduleCount={rescheduleCount}
              />
            </Card>
          )}
        </div>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Interview timeline</h2>
          <p className="mt-1 text-[11px] text-muted">Each entry comes from the interview event log.</p>
          {interview.events.length ? (
            <ol className="mt-5 space-y-4">
              {interview.events.map((event) => (
                <li key={event.id} className="relative flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {event.fromState.replaceAll("_", " ")} <span className="text-faint">→</span>{" "}
                      {event.toState.replaceAll("_", " ")}
                    </p>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {event.actorRole.toLowerCase()} · {formatIstDayLong(event.createdAt)} · {formatIstTime(event.createdAt)} IST
                    </p>
                    {event.reason && <p className="mt-1 text-[11px] leading-relaxed text-muted">{event.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-xs text-faint">No events recorded yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
