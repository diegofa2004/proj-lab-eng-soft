import type { Metadata } from "next";

import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { getSubscriptionPageData } from "@/app/lib/subscription";
import { pageBody, pageContainer } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SubscriptionCheckout from "@/components/subscription/subscription-checkout";

export const metadata: Metadata = {
  title: "Subscription Checkout · LivrUSP",
};

export default async function SubscriptionPage() {
  const { profile, assets, billingConfig, plans, subscriptions, payments } =
    await getSubscriptionPageData();

  return (
    <div className={pageBody}>
      <div className={pageContainer}>
        <SiteHeader
          activeHref="/subscription"
          assets={assets}
          currentUser={{
            username: profile.nome_perfil,
            is_admin: Boolean(profile.is_admin),
            id_avatar: profile.id_avatar,
            id_icone: profile.id_icone,
            profile_ring: profile.profile_ring,
            profile_avatar: profile.profile_avatar,
            nivel: profile.nivel,
          }}
        />

        <main className="space-y-10 pt-4 pb-16 sm:pt-8 sm:pb-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#556B45]">
              Membership &amp; Billing
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.98] font-normal tracking-tight text-black sm:text-6xl md:text-7xl">
              Subscription checkout.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
              Choose a LivrUSP Premium plan, complete simulated server checkout, and manage your
              active membership and payment history.
            </p>
          </div>

          <SubscriptionCheckout
            initialBillingConfig={billingConfig}
            initialPayments={payments}
            initialPlans={plans}
            initialProfile={profile}
            initialSubscriptions={subscriptions}
          />
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
