"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import styles from "@/components/auth/auth.module.css";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function LoginPage() {
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

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
      setMessage(`Signed in as ${data.username}.`);
      router.replace("/profile");
      router.refresh();
    } catch {
      setFormStatus("error");
      setMessage("Unable to reach the authentication service. Please try again.");
    }
  }

  const isSubmitting = formStatus === "submitting";

  return (
    <AuthShell mode="login">
      <section className={styles.formPanel} aria-labelledby="login-heading">
        <p className={styles.formEyebrow}>YOUR ACCOUNT / 01</p>
        <h2 className={styles.formTitle} id="login-heading">Sign in</h2>
        <p className={styles.formDescription}>Your next read is waiting for you.</p>

        <form className={styles.form} noValidate onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Username</label>
            <input
              autoComplete="username"
              className={styles.input}
              id="username"
              maxLength={100}
              minLength={1}
              name="username"
              placeholder="Your username"
              required
              type="text"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              className={styles.input}
              id="password"
              maxLength={72}
              minLength={1}
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </div>

          <button className={styles.submitButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
            {!isSubmitting && <span aria-hidden="true">↗</span>}
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
          New to livrUSP?{" "}
          <Link className={styles.textLink} href="/signup">Create an account</Link>
        </p>
      </section>
    </AuthShell>
  );
}
