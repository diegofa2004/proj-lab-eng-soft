import { cookies } from "next/headers";

import { getBackendUrl } from "@/app/lib/books";
import { getProfileAssets, requireUserProfile } from "@/app/lib/profile";
import { accessTokenCookieName } from "@/app/lib/session";
import {
  type BillingConfig,
  type PaymentRecord,
  type Subscription,
  type SubscriptionPlan,
} from "@/app/lib/subscription-utils";

export {
  DEFAULT_FAMILY_AND_FRIENDS_PLAN,
  DEFAULT_INDIVIDUAL_PLAN,
  DEFAULT_PREMIUM_PLAN,
  FAMILY_AND_FRIENDS_MAX_MEMBERS,
  FAMILY_AND_FRIENDS_MIN_HOLDER_AGE,
  PREMIUM_BENEFITS,
  calculateAgeFromBirthDate,
  computeFamilyPlanPrice,
  formatCycleDuration,
  formatPaymentStatus,
  formatPerPersonPrice,
  formatPeriodicity,
  formatPeriodicityInterval,
  formatPlanPrice,
  formatSubscriptionDate,
  formatSubscriptionStatus,
  getActiveSubscription,
  getPlanPerPersonPrice,
  isFamilyAndFriendsPlan,
  resolvePremiumPlan,
  resolvePremiumPlans,
  validateFamilyAndFriendsCheckout,
} from "@/app/lib/subscription-utils";
export type {
  BillingConfig,
  CheckoutResponse,
  FamilyCheckoutValidationResult,
  FamilyPlanHolderDetails,
  PaymentRecord,
  PaymentStatus,
  PlanTier,
  PremiumBenefit,
  Subscription,
  SubscriptionPeriodicity,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/app/lib/subscription-utils";

/** Fetches the server billing simulation configuration. */
export async function getBillingConfig(): Promise<BillingConfig> {
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/billing/config`, `${backendUrl}/billing/config`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as { demo_billing?: unknown } | null;
      return { demo_billing: Boolean(data?.demo_billing) };
    } catch {
      // Try next fallback endpoint
    }
  }

  return { demo_billing: false };
}

/** Lists active subscription plans available for checkout, ordered by plan ID. */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/plans`, `${backendUrl}/plans`]) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as SubscriptionPlan[];
      if (Array.isArray(data)) {
        return data
          .filter((plan) => plan.ativo !== false)
          .sort((a, b) => a.id_plano - b.id_plano);
      }
    } catch {
      // Try next fallback endpoint
    }
  }

  return [];
}

/** Lists the authenticated reader's subscriptions, newest first. */
export async function getUserSubscriptions(): Promise<Subscription[]> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return [];
  }

  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/me/subscriptions`, `${backendUrl}/me/subscriptions`]) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as Subscription[];
      if (Array.isArray(data)) {
        return [...data].sort((a, b) => b.id_assinatura - a.id_assinatura);
      }
    } catch {
      // Try next fallback endpoint
    }
  }

  return [];
}

/** Lists the authenticated reader's payment records, newest first. */
export async function getUserPayments(): Promise<PaymentRecord[]> {
  const token = (await cookies()).get(accessTokenCookieName)?.value;
  if (!token) {
    return [];
  }

  const backendUrl = getBackendUrl();

  for (const endpoint of [`${backendUrl}/v2/me/payments`, `${backendUrl}/me/payments`]) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as PaymentRecord[];
      if (Array.isArray(data)) {
        return [...data].sort((a, b) => b.id_pagamento - a.id_pagamento);
      }
    } catch {
      // Try next fallback endpoint
    }
  }

  return [];
}

/** Loads all data required to render the subscription checkout page for the current reader. */
export async function getSubscriptionPageData() {
  const [profile, assets, billingConfig, plans, subscriptions, payments] = await Promise.all([
    requireUserProfile(),
    getProfileAssets(),
    getBillingConfig(),
    getSubscriptionPlans(),
    getUserSubscriptions(),
    getUserPayments(),
  ]);

  return {
    profile,
    assets,
    billingConfig,
    plans,
    subscriptions,
    payments,
  };
}
