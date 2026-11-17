"use client";

import Link from "next/link";
import { type SyntheticEvent, useState } from "react";

import { card } from "@/app/lib/ui";
import {
  authHintClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitClassName,
} from "@/components/auth/auth-form-classes";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function SignupForm() {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      setFormStatus("error");
      setMessage("Please check the fields above.");
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmPassword") ?? "");
    const confirmationInput = form.elements.namedItem("confirmPassword") as HTMLInputElement | null;

    if (password !== confirmation) {
      confirmationInput?.setCustomValidity("Passwords do not match.");
      confirmationInput?.reportValidity();
      setFormStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setFormStatus("error");
      setMessage("Password must be at most 72 bytes long.");
      return;
    }

    setFormStatus("submitting");
    setMessage("");
    setRequiresSignIn(false);
    let accountCreated = false;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          email: formData.get("email"),
          password,
        }),
      });
      const data = (await response.json()) as { detail?: unknown; username?: string };

      if (!response.ok) {
        setFormStatus("error");
        setMessage(typeof data.detail === "string" ? data.detail : "Account creation failed. Please try again.");
        return;
      }

      accountCreated = true;
      form.reset();
      setFormStatus("success");
      setMessage("Account created. Welcome to livrUSP.");

      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username ?? formData.get("username"),
          password,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error("Automatic sign-in failed.");
      }

      window.location.replace("/home");
    } catch {
      if (accountCreated) {
        setFormStatus("success");
        setMessage("Account created. Please sign in to continue.");
        setRequiresSignIn(true);
      } else {
        setFormStatus("error");
        setMessage("Unable to reach the authentication service. Please try again.");
      }
    }
  }

  const isSubmitting = formStatus === "submitting";
  const isComplete = formStatus === "success";

  return (
    <section
      aria-labelledby="signup-heading"
      className={`${card} w-full p-6 sm:p-8`}
    >
      {isComplete ? (
        <div
          aria-live="polite"
          className="flex min-h-[320px] flex-col items-center justify-center text-center"
          role="status"
        >
          <h2
            className="font-serif text-4xl leading-tight font-normal tracking-tight text-black"
            id="signup-heading"
          >
            {message || "Account created. Welcome to livrUSP."}
          </h2>
          {requiresSignIn ? (
            <p className="mt-5 text-sm text-black/60">
              <Link className="font-semibold text-[#1E2E4F] hover:underline" href="/login">
                Sign in
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
            Your account / 02
          </p>
          <h2
            className="mt-2 font-serif text-4xl leading-tight font-normal tracking-tight text-black"
            id="signup-heading"
          >
            Create an account
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-black/60">
            Start your own collection of stories.
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
                minLength={3}
                name="username"
                placeholder="Choose a username"
                required
                type="text"
              />
            </div>

            <div>
              <label className={authLabelClassName} htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className={authInputClassName}
                id="email"
                maxLength={254}
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>

            <div>
              <label className={authLabelClassName} htmlFor="password">
                Password
              </label>
              <input
                autoComplete="new-password"
                className={authInputClassName}
                id="password"
                maxLength={72}
                minLength={8}
                name="password"
                placeholder="Create a password"
                required
                type="password"
              />
              <p className={authHintClassName}>Use 8 to 72 characters.</p>
            </div>

            <div>
              <label className={authLabelClassName} htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                autoComplete="new-password"
                className={authInputClassName}
                id="confirmPassword"
                maxLength={72}
                minLength={8}
                name="confirmPassword"
                onChange={(event) => event.currentTarget.setCustomValidity("")}
                placeholder="Repeat your password"
                required
                type="password"
              />
            </div>

            <button
              className={`${authSubmitClassName} w-full`}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
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
            Already have an account?{" "}
            <Link className="font-semibold text-[#1E2E4F] hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
