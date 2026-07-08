"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/authConstants";

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
