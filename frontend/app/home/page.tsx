import type { Metadata } from "next";

import { getOptionalCurrentUser, getSignedHomeData } from "@/app/lib/books";
import SignedHomePage from "@/components/home/signed-home-page";

export const metadata: Metadata = {
  title: "Home · LivrUSP",
};

export default async function SignedHomeRoutePage() {
  const currentUser = await getOptionalCurrentUser();
  const data = await getSignedHomeData(currentUser);

  return <SignedHomePage data={data} />;
}

