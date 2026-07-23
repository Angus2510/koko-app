import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 mb-4">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          KOKO MOS
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manufacturing Operating System
        </p>
      </div>

      {/* Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-white">Sign in</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Enter your credentials to access the system
          </p>
        </div>
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Contact your administrator if you need access.
      </p>
    </div>
  );
}
