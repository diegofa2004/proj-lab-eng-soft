import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getForYouHomeData, getOptionalCurrentUser } from "@/app/lib/books";
import ForYouHomePage from "@/components/home/for-you-home-page";

export const metadata: Metadata = {
  title: "For You · LivrUSP",
};

export default async function SignedHomeRoutePage() {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  if (!currentUser.onboarding_generos_concluido) {
    redirect("/onboarding");
  }
  const data = await getForYouHomeData(currentUser);

  return <ForYouHomePage currentUser={currentUser} data={data} />;
}

