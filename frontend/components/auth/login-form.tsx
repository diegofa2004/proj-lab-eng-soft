"use client";

import Link from "next/link";
import { type SyntheticEvent, useState } from "react";

import { card } from "@/app/lib/ui";
import {
  authInputClassName,
  authLabelClassName,
  authSubmitClassName,
} from "@/components/auth/auth-form-classes";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function LoginForm() {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      setFormStatus("error");
      setMessage("Please check the fields above.");
      form.reportValidity();
      return;
    }

    setFormStatus("submitting");
    setMessage("");

    try {
      const formData = new FormData(form);
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const data = (await response.json()) as { detail?: unknown; username?: string };

      if (!response.ok) {
        setFormStatus("error");
        setMessage(typeof data.detail === "string" ? data.detail : "Sign-in failed. Please try again.");
        return;
      }

      setFormStatus("success");
      setMessage("Welcome! Signing in...");
      window.location.replace("/home");
    } catch {
      setFormStatus("error");
      setMessage("Unable to reach the authentication service. Please try again.");
    }
  }

  const isSubmitting = formStatus === "submitting";
  const isComplete = formStatus === "success";

  return (
    <section
      aria-labelledby="login-heading"
      className={`${card} w-full p-6 sm:p-8`}
    >
      {isComplete ? (
        <div
          aria-live="polite"
          className="flex min-h-[320px] items-center justify-center text-center"
          role="status"
        >
          <h2
            className="font-serif text-4xl leading-tight font-normal tracking-tight text-black"
            id="login-heading"
          >
            {message || "Welcome! Signing in..."}
          </h2>
        </div>
      ) : (
        <>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
            Your account / 01
          </p>
          <h2
            className="mt-2 font-serif text-4xl leading-tight font-normal tracking-tight text-black"
            id="login-heading"
          >
            Sign in
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-black/60">
            Your next read is waiting for you.
          </p>

          <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit}>
            <div>
              <label className={authLabelClassName} htmlFor="username">
                Username
              </label>
              <input
                autoComplete="username"
                className={authInputClassName}
                id="username"
                maxLength={100}
                minLength={1}
                name="username"
                placeholder="Your username"
                required
                type="text"
              />
            </div>

            <div>
              <label className={authLabelClassName} htmlFor="password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className={authInputClassName}
                id="password"
                maxLength={72}
                minLength={1}
                name="password"
                placeholder="Enter your password"
                required
                type="password"
              />
            </div>

            <button
              className={`${authSubmitClassName} w-full`}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
              {!isSubmitting ? <span aria-hidden="true">↗</span> : null}
            </button>

            {message ? (
              <p
                aria-live="polite"
                className={`text-sm ${
                  formStatus === "error" ? "text-red-600" : "text-emerald-700"
                }`}
                role={formStatus === "error" ? "alert" : "status"}
              >
                {message}
              </p>
            ) : null}
          </form>

          <p className="mt-6 text-sm text-black/60">
            New to livrUSP?{" "}
            <Link className="font-semibold text-[#1E2E4F] hover:underline" href="/signup">
              Create an account
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
