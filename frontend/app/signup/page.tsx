"use client";

import Link from "next/link";
import { type SyntheticEvent, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import styles from "@/components/auth/auth.module.css";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function SignupPage() {
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

      form.reset();
      setFormStatus("success");
      setMessage("Account created. Welcome to livrUSP!");
      window.location.replace("/home");
    } catch {
      if (accountCreated) {
        form.reset();
        setFormStatus("success");
        setMessage("Your account was created, but automatic sign-in failed. Please use Sign in below.");
      } else {
        setFormStatus("error");
        setMessage("Unable to reach the authentication service. Please try again.");
      }
    }
  }

  const isSubmitting = formStatus === "submitting";
  const isComplete = formStatus === "success";

  return (
    <AuthShell mode="signup">
      <section className={styles.formPanel} aria-labelledby="signup-heading">
        <p className={styles.formEyebrow}>YOUR ACCOUNT / 02</p>
        <h2 className={styles.formTitle} id="signup-heading">Create an account</h2>
        <p className={styles.formDescription}>Start your own collection of stories.</p>

        <form className={styles.form} noValidate onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Username</label>
            <input
              autoComplete="username"
              className={styles.input}
              id="username"
              maxLength={100}
              minLength={3}
              name="username"
              placeholder="Choose a username"
              required
              type="text"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              autoComplete="email"
              className={styles.input}
              id="email"
              maxLength={254}
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              autoComplete="new-password"
              className={styles.input}
              id="password"
              maxLength={72}
              minLength={8}
              name="password"
              placeholder="Create a password"
              required
              type="password"
            />
            <p className={styles.hint}>Use 8 to 72 characters.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm password</label>
            <input
              autoComplete="new-password"
              className={styles.input}
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

          <button className={styles.submitButton} disabled={isSubmitting || isComplete} type="submit">
            {isSubmitting ? "Creating account..." : isComplete ? "Account created" : "Create account"}
            {!isSubmitting && !isComplete && <span aria-hidden="true">↗</span>}
          </button>

          <p
            aria-live="polite"
            className={`${styles.formMessage} ${formStatus === "error" ? styles.error : styles.success}`}
            role={formStatus === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        </form>

        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link className={styles.textLink} href="/login">Sign in</Link>
        </p>
      </section>
    </AuthShell>
  );
}
