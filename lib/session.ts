import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const DEMO_COOKIE = "grit_demo_user";
export const DEFAULT_STUDENT_EMAIL = "aarav.sharma@niatindia.com";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "INTERVIEWER" | "ADMIN";
  campus: string | null;
  cohort: string | null;
  hue: number;
  studentProfileId: string | null;
  interviewerProfileId: string | null;
};

export async function getCurrentUser(): Promise<SessionUser> {
  const store = await cookies();
  const id = store.get(DEMO_COOKIE)?.value;

  const user =
    (id ? await prisma.user.findUnique({ where: { id }, include: { studentProfile: true, interviewerProfile: true } }) : null) ??
    (await prisma.user.findUnique({
      where: { email: DEFAULT_STUDENT_EMAIL },
      include: { studentProfile: true, interviewerProfile: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: "STUDENT" },
      include: { studentProfile: true, interviewerProfile: true },
    }));

  if (!user) throw new Error("No demo users seeded. Run npm run db:reset");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as SessionUser["role"],
    campus: user.campus,
    cohort: user.cohort,
    hue: user.hue,
    studentProfileId: user.studentProfile?.id ?? null,
    interviewerProfileId: user.interviewerProfile?.id ?? null,
  };
}

export async function getPersonas() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { studentProfile: true, interviewerProfile: true },
  });
  return users;
}

export function homeForRole(role: string): string {
  if (role === "INTERVIEWER") return "/interviewer/schedule";
  if (role === "ADMIN") return "/admin/students";
  return "/student";
}
