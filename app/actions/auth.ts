"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEMO_COOKIE, homeForRole } from "@/lib/session";

export async function switchPersona(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Unknown demo user");

  const store = await cookies();
  store.set(DEMO_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(redirectTo || homeForRole(user.role));
}
