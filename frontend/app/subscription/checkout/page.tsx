import type { Metadata } from "next";

import { SIGNED_NAV_LINKS } from "@/app/lib/navigation";
import { getSubscriptionPageData } from "@/app/lib/subscription";
import { pageBody, pageContainer } from "@/app/lib/ui";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SubscriptionCheckout from "@/components/subscription/subscription-checkout";

export const metadata: Metadata = {
  title: "Subscribe now · LivrUSP",
};

export default async function SubscriptionCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ profile, assets, billingConfig, plans, subscriptions, payments }, params] =
    await Promise.all([getSubscriptionPageData(), searchParams]);

  const rawPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const parsedPlan = Number(rawPlan);
  const initialPlanId = Number.isInteger(parsedPlan) && parsedPlan > 0 ? parsedPlan : null;

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
              Subscribe now.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/60 sm:text-base">
              Confirm the details of your chosen LivrUSP Premium plan to activate your membership.
            </p>
          </div>

          <SubscriptionCheckout
            initialBillingConfig={billingConfig}
            initialPayments={payments}
            initialPlanId={initialPlanId}
            initialPlans={plans}
            initialProfile={profile}
            initialSubscriptions={subscriptions}
            view="form"
          />
        </main>

        <SiteFooter links={SIGNED_NAV_LINKS} />
      </div>
    </div>
  );
}
