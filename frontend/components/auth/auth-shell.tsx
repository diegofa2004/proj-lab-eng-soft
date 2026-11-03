import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./auth.module.css";

type AuthShellProps = {
  mode: "login" | "signup";
  children: ReactNode;
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.logoLink} href="/" aria-label="livrUSP — home">
          <span className={styles.logo} aria-hidden="true" />
        </Link>

        <nav aria-label="Account">
          <Link className={styles.headerAction} href={isLogin ? "/signup" : "/login"}>
            {isLogin ? "Sign up" : "Sign in"}
            <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.editorial} aria-label="About livrUSP">
          <p className={styles.eyebrow}>READ · REVIEW · PUBLISH</p>
          <h1 className={styles.heroTitle}>
            {isLogin ? (
              <>Back to the books.</>
            ) : (
              <>A new chapter begins.</>
            )}
          </h1>
          <p className={styles.heroDescription}>
            {isLogin
              ? "Your stories, your shelves, your next great read — right where you left them."
              : "Make room for every story you love. Read, share and discover in one place."}
          </p>

          <div className={styles.bookshelf} aria-hidden="true">
            <div className={`${styles.book} ${styles.bookOne}`}>
              <span className={styles.bookTop}>LIVRUSP EDITIONS</span>
              <span className={styles.bookBig}>THE<br />NEXT<br />PAGE</span>
              <span className={styles.bookBottom}>A world of stories</span>
            </div>
            <div className={`${styles.book} ${styles.bookTwo}`}>
              <span className={styles.bookTop}>THE READING LIST</span>
              <span className={styles.bookBig}>BOOKS<br />&amp; YOU</span>
              <span className={styles.bookBottom}>Vol. 01</span>
            </div>
            <div className={`${styles.book} ${styles.bookThree}`}>
              <span className={styles.bookTop}>AN OPEN BOOK</span>
              <span className={styles.bookBig}>EVERY<br />STORY<br />COUNTS.</span>
              <span className={styles.bookBottom}>livrUSP</span>
            </div>
            <span className={styles.bookshelfCaption}>YOUR NEXT CHAPTER STARTS HERE ↗</span>
          </div>
        </section>

        {children}
      </main>

      <footer className={styles.footer}>
        <span>© livrUSP · {new Date().getFullYear()}</span>
        <span>Every story has a place.</span>
      </footer>
    </div>
  );
}
