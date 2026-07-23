"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@koko/types";

// ─── Validation ───────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Return a generic error — do not expose whether the email exists
    return { success: false, error: "Invalid email or password" };
  }

  return { success: true };
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (process.env.AUTH_BYPASS === "true") {
    redirect("/dashboard");
  }

  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
