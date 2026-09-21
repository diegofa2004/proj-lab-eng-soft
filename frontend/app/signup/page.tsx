"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function SignupPage() {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.checkValidity()) {
      setFormStatus("error");
      event.currentTarget.reportValidity();
      return;
    }

    setFormStatus("submitting");
    window.setTimeout(() => setFormStatus("success"), 300);
  }

  const isSubmitting = formStatus === "submitting";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">LivrUSP</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-3 text-slate-600">Start following the books you love.</p>

        <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="username">
              Username
            </label>
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="username"
              maxLength={50}
              minLength={3}
              name="username"
              required
              type="text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="email"
              maxLength={320}
              name="email"
              required
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="password"
              maxLength={72}
              minLength={8}
              name="password"
              required
              type="password"
            />
            <p className="mt-2 text-sm text-slate-500">Use 8 to 72 characters.</p>
          </div>

          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>

          <p aria-live="polite" className="text-sm" role="status">
            {formStatus === "error" && "Please correct the highlighted fields."}
            {formStatus === "success" && "Your account details are ready to be sent to the API."}
          </p>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/login">
            Sign in
          </Link>
        </p>
        <Link className="mt-5 inline-block font-semibold text-indigo-600 hover:text-indigo-700" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
