import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getCurrentUser } from "@/lib/session";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRIT — Interview Scheduling",
  description:
    "Level Clearance Interview scheduling for GRIT track badges: student booking, interviewer availability, outcomes, and badge states.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <TopNav user={user} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</main>
        <footer className="border-t border-line/60 py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-[11px] text-faint sm:flex-row sm:px-6">
            <span>GRIT Interview Scheduling · working prototype · demo data, no real accounts</span>
            <span className="tabular">All times shown in IST (UTC+5:30)</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
