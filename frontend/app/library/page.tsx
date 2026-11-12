import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getOptionalCurrentUser, getSignedHomeData } from "@/app/lib/books";
import SignedHomePage from "@/components/home/signed-home-page";

export const metadata: Metadata = {
  title: "My library · LivrUSP",
};

export default async function LibraryPage() {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) redirect("/login");

  const data = await getSignedHomeData(currentUser);
  return <SignedHomePage currentUser={currentUser} data={data} />;
}
