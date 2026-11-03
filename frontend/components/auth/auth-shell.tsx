import Link from "next/link";
import Image from "next/image";
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
            <Image
              alt=""
              className={styles.booksImage}
              height={1024}
              sizes="(max-width: 900px) 40vw, 600px"
              src="/auth-books-v2.png"
              width={1536}
            />
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
