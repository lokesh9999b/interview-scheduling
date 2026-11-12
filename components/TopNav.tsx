"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ArrowLeftRight, CalendarCheck, CalendarClock, FileText, Flag, GraduationCap, Inbox, LayoutGrid, Sparkles } from "lucide-react";
import { Avatar } from "./ui";

type NavUser = {
  name: string;
  role: "STUDENT" | "INTERVIEWER" | "ADMIN";
  hue: number;
  campus: string | null;
};

const NAV: Record<string, { href: string; label: string; icon: React.ReactNode }[]> = {
  STUDENT: [
    { href: "/student", label: "Dashboard", icon: <LayoutGrid size={15} /> },
    { href: "/student/book", label: "Book", icon: <CalendarClock size={15} /> },
    { href: "/student/messages", label: "Messages", icon: <Inbox size={15} /> },
    { href: "/student/before-after", label: "Before / After", icon: <ArrowLeftRight size={15} /> },
    { href: "/writeup", label: "Write-up", icon: <FileText size={15} /> },
  ],
  INTERVIEWER: [
    { href: "/interviewer/schedule", label: "Schedule", icon: <CalendarCheck size={15} /> },
    { href: "/interviewer/availability", label: "Availability", icon: <CalendarClock size={15} /> },
    { href: "/writeup", label: "Write-up", icon: <FileText size={15} /> },
  ],
  ADMIN: [
    { href: "/admin/students", label: "Eligible students", icon: <GraduationCap size={15} /> },
    { href: "/admin/flags", label: "Malpractice flags", icon: <Flag size={15} /> },
    { href: "/writeup", label: "Write-up", icon: <FileText size={15} /> },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  INTERVIEWER: "Interviewer",
  ADMIN: "Interview Ops",
};

export function TopNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const items = NAV[user.role] ?? [];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink">
            <Sparkles size={16} strokeWidth={2.6} />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold tracking-[0.18em] text-fg">GRIT</span>
            <span className="mt-1 text-[10px] tracking-wide text-faint">Interview Scheduling</span>
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-[11px] font-medium text-muted transition hover:border-accent/40 hover:text-fg sm:flex"
          >
            <ArrowLeftRight size={12} />
            Switch demo user
          </Link>
          <div className="flex items-center gap-2">
            <Avatar name={user.name} hue={user.hue} size={30} />
            <div className="hidden leading-tight md:block">
              <div className="text-xs font-semibold text-fg">{user.name.split(" ")[0]}</div>
              <div className="text-[10px] text-faint">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
