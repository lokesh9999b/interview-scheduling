import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { journeyMeta } from "@/lib/state-machine";
import { formatIstDayLong, formatIstTime } from "@/lib/time";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const students = await prisma.studentProfile.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: true,
      progress: { include: { badge: { include: { track: true } } } },
      interviews: { orderBy: { startsAt: "desc" } },
    },
  });

  const header = [
    "Student",
    "Email",
    "Campus",
    "Attendance %",
    "Track",
    "Badge",
    "Skills cleared",
    "Status",
    "Attempts used",
    "Active interview",
    "Last outcome",
    "Cooldown until",
    "Miles",
  ];

  const lines = students.map((s) => {
    const progress = s.progress[0];
    const active = s.interviews.find((i) => ["BOOKED", "AWAITING_OUTCOME"].includes(i.status));
    const last = s.interviews.find((i) => ["PASSED", "FAILED", "RETAKE_REQUIRED", "NO_SHOW"].includes(i.status));
    return [
      s.user.name,
      s.user.email,
      s.user.campus,
      s.attendancePct,
      progress?.badge.track.name,
      progress?.badge.name,
      `${progress?.skillsCleared ?? 0}/${progress?.skillsTotal ?? 4}`,
      journeyMeta(progress?.status ?? "IN_PROGRESS").label,
      progress?.attemptsUsed ?? 0,
      active ? `${formatIstDayLong(active.startsAt)} ${formatIstTime(active.startsAt)} IST` : "",
      last?.outcome ?? last?.status ?? "",
      progress?.cooldownUntil ? formatIstDayLong(progress.cooldownUntil) : "",
      s.miles,
    ]
      .map(csvCell)
      .join(",");
  });

  const csv = [header.map(csvCell).join(","), ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="grit-eligible-students-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
