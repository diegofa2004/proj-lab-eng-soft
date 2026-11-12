import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { CSSProperties } from "react";
import { getOptionalCurrentUser } from "@/app/lib/books";
import { getProfileBackground } from "@/app/lib/profile-utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "LivrUSP",
  description: "Book reading and publishing",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const currentUser = await getOptionalCurrentUser();
  const background = getProfileBackground(currentUser?.profile_background);
  const bodyStyle = background
    ? ({ "--livrusp-background-image": `url("${background.src}")` } as CSSProperties)
    : undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={bodyStyle}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
