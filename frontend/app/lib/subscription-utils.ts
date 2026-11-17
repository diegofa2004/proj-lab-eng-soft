export type SubscriptionPeriodicity = "mensal" | "anual";

export type SubscriptionStatus = "pendente" | "ativa" | "cancelada" | "expirada";

export type PaymentStatus = "pendente" | "aprovado" | "recusado" | "estornado";

export type PlanTier = "individual" | "family_and_friends";

export const FAMILY_AND_FRIENDS_MAX_MEMBERS = 4;
export const FAMILY_AND_FRIENDS_MIN_HOLDER_AGE = 18;

export type SubscriptionPlan = {
  id_plano: number;
  nome: string;
  preco: string | number;
  moeda: string;
  periodicidade: SubscriptionPeriodicity;
  ativo: boolean;
  tier?: PlanTier;
  max_members?: number;
  requires_adult_holder?: boolean;
  tagline?: string;
  description?: string;
};

export type FamilyPlanHolderDetails = {
  holderName: string;
  holderEmail: string;
  holderBirthDate: string;
  holderAgeConfirmed: boolean;
  members: string[];
};

export type Subscription = {
  id_assinatura: number;
  id_usuario: number;
  id_plano: number;
  status: SubscriptionStatus;
  inicio: string;
  fim: string | null;
  referencia_provedor: string | null;
};

export type PaymentRecord = {
  id_pagamento: number;
  id_assinatura: number;
  valor: string | number;
  moeda: string;
  status: PaymentStatus;
  data_hora: string;
  referencia_provedor: string | null;
};

export type BillingConfig = {
  demo_billing: boolean;
};

export type CheckoutResponse = {
  subscription: Subscription;
  payment: PaymentRecord | null;
};

export type PremiumBenefit = {
  title: string;
  description: string;
};

export const DEFAULT_INDIVIDUAL_PLAN: SubscriptionPlan = {
  id_plano: 1,
  nome: "LivrUSP Premium Individual",
  preco: "9.90",
  moeda: "BRL",
  periodicidade: "mensal",
  ativo: true,
  tier: "individual",
  max_members: 1,
  requires_adult_holder: false,
  tagline: "1 reader · Individual access",
  description:
    "Full LivrUSP Premium membership for a single reader, immediately unlocking book publishing rights and exclusive profile cosmetics.",
};

export const DEFAULT_FAMILY_AND_FRIENDS_PLAN: SubscriptionPlan = {
  id_plano: 2,
  nome: "LivrUSP Premium Family and Friends",
  preco: "29.90",
  moeda: "BRL",
  periodicidade: "mensal",
  ativo: true,
  tier: "family_and_friends",
  max_members: FAMILY_AND_FRIENDS_MAX_MEMBERS,
  requires_adult_holder: true,
  tagline: "Up to 4 different people · Lower price per person",
  description:
    "Share the exact same Premium benefits with up to 4 different people. Cheaper per person with 4 members. Requires a primary account holder (titular) aged 18 or older.",
};

export const DEFAULT_PREMIUM_PLAN: SubscriptionPlan = DEFAULT_INDIVIDUAL_PLAN;

/** Computes a Family and Friends total price that stays cheaper per person (at 4 people) than the Individual plan. */
export function computeFamilyPlanPrice(individualPrice: string | number): string {
  const numericValue =
    typeof individualPrice === "number" ? individualPrice : Number(individualPrice);
  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue === 9.9) {
    return "29.90";
  }
  return (numericValue * 3).toFixed(2);
}

/** Returns the numeric per-person price for a plan given a number of people sharing it. */
export function getPlanPerPersonPrice(preco: string | number, peopleCount = 1): number {
  const numericValue = typeof preco === "number" ? preco : Number(preco);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }
  return numericValue / Math.max(1, peopleCount);
}

/** Determines whether a plan represents the Family and Friends tier. */
export function isFamilyAndFriendsPlan(plan: SubscriptionPlan): boolean {
  return plan.tier === "family_and_friends";
}

/** Returns only plans actually configured by the backend, in checkout display order. */
export function resolvePremiumPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return plans
    .filter(
      (plan) =>
        plan.ativo !== false && (plan.tier === "individual" || plan.tier === "family_and_friends"),
    )
    .sort((left, right) => {
      if (left.tier === right.tier) return left.id_plano - right.id_plano;
      return left.tier === "individual" ? -1 : 1;
    });
}

/** Resolves the default Individual LivrUSP Premium plan shown in checkout. */
export function resolvePremiumPlan(plans: SubscriptionPlan[]): SubscriptionPlan {
  return resolvePremiumPlans(plans).find((plan) => plan.tier === "individual") ?? DEFAULT_INDIVIDUAL_PLAN;
}

export const PREMIUM_BENEFITS: readonly PremiumBenefit[] = [
  {
    title: "Publish original books right away",
    description:
      "Unlock author publishing permissions immediately without waiting to accumulate reading level points.",
  },
  {
    title: "Exclusive avatars & badge icons",
    description:
      "Equip Premium-only profile avatars and companion badge icons in your Profile Editor.",
  },
  {
    title: "Premium reader identity",
    description:
      "Display your active Premium membership badge across your profile card and account overview.",
  },
  {
    title: "Premium discovery access",
    description:
      "Gain access to Premium reader discovery features while keeping your shelves and progress synced.",
  },
];

/** Formats a decimal price string or number with the plan currency code. */
export function formatPlanPrice(preco: string | number, moeda = "BRL"): string {
  const numericValue = typeof preco === "number" ? preco : Number(preco);
  const normalizedCurrency = moeda.trim().toUpperCase() || "BRL";

  if (!Number.isFinite(numericValue)) {
    return `${normalizedCurrency} ${String(preco)}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${normalizedCurrency} ${numericValue.toFixed(2)}`;
  }
}

/** Formats the per-person price of a plan for a given member count. */
export function formatPerPersonPrice(
  preco: string | number,
  moeda = "BRL",
  peopleCount = 1,
): string {
  return formatPlanPrice(getPlanPerPersonPrice(preco, peopleCount), moeda);
}

/** Formats plan billing periodicity into an English label. */
export function formatPeriodicity(periodicidade: string): string {
  if (periodicidade === "mensal") {
    return "Monthly";
  }
  if (periodicidade === "anual") {
    return "Annual";
  }
  return periodicidade;
}

/** Formats plan billing periodicity into a human-readable billing interval. */
export function formatPeriodicityInterval(periodicidade: string): string {
  if (periodicidade === "mensal") {
    return "per month";
  }
  if (periodicidade === "anual") {
    return "per year";
  }
  return "";
}

/** Formats plan cycle duration for the checkout summary. */
export function formatCycleDuration(periodicidade: string): string {
  if (periodicidade === "mensal") {
    return "1 month";
  }
  if (periodicidade === "anual") {
    return "12 months";
  }
  return "1 billing cycle";
}

/** Returns display label and pill styling for a subscription status. */
export function formatSubscriptionStatus(status: string): {
  label: string;
  badgeClassName: string;
} {
  switch (status) {
    case "ativa":
      return {
        label: "Active",
        badgeClassName: "border-[#556B45]/30 bg-[#556B45]/15 text-[#3A4B2E]",
      };
    case "pendente":
      return {
        label: "Pending",
        badgeClassName: "border-amber-600/30 bg-amber-100/80 text-amber-900",
      };
    case "cancelada":
      return {
        label: "Cancelled",
        badgeClassName: "border-black/15 bg-black/5 text-black/65",
      };
    case "expirada":
      return {
        label: "Expired",
        badgeClassName: "border-red-300 bg-red-50 text-red-800",
      };
    default:
      return {
        label: status,
        badgeClassName: "border-black/15 bg-white/80 text-black/70",
      };
  }
}

/** Returns display label and pill styling for a payment status. */
export function formatPaymentStatus(status: string): {
  label: string;
  badgeClassName: string;
} {
  switch (status) {
    case "aprovado":
      return {
        label: "Approved",
        badgeClassName: "border-[#556B45]/30 bg-[#556B45]/15 text-[#3A4B2E]",
      };
    case "pendente":
      return {
        label: "Pending",
        badgeClassName: "border-amber-600/30 bg-amber-100/80 text-amber-900",
      };
    case "recusado":
      return {
        label: "Declined",
        badgeClassName: "border-red-300 bg-red-50 text-red-800",
      };
    case "estornado":
      return {
        label: "Refunded",
        badgeClassName: "border-black/15 bg-black/5 text-black/65",
      };
    default:
      return {
        label: status,
        badgeClassName: "border-black/15 bg-white/80 text-black/70",
      };
  }
}

/** Formats ISO 8601 date/time strings consistently for English UI copy. */
export function formatSubscriptionDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

/** Finds the user's currently active, non-expired subscription if one exists. */
export function getActiveSubscription(subscriptions: Subscription[]): Subscription | null {
  const now = Date.now();
  return (
    subscriptions.find((subscription) => {
      if (subscription.status !== "ativa") {
        return false;
      }
      if (!subscription.fim) {
        return true;
      }
      const endTimestamp = Date.parse(subscription.fim);
      return Number.isNaN(endTimestamp) || endTimestamp > now;
    }) ?? null
  );
}

/** Calculates completed years of age from a YYYY-MM-DD birth date string, or null if invalid. */
export function calculateAgeFromBirthDate(
  birthDate: string,
  referenceDate = new Date(),
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export type FamilyCheckoutValidationResult =
  | {
      valid: true;
      holderAge: number;
      cleanedMembers: string[];
    }
  | {
      valid: false;
      error: string;
    };

/** Validates primary adult holder (titular 18+) and distinct member requirements for Family and Friends. */
export function validateFamilyAndFriendsCheckout(input: {
  holderName?: unknown;
  holderEmail?: unknown;
  holderBirthDate?: unknown;
  holderAgeConfirmed?: unknown;
  members?: unknown;
  optional?: boolean;
}): FamilyCheckoutValidationResult {
  if (input.optional && input.holderBirthDate === undefined && input.members === undefined) {
    return { valid: true, holderAge: 0, cleanedMembers: [] };
  }
  const holderName = typeof input.holderName === "string" ? input.holderName.trim() : "";
  if (holderName.length < 2) {
    return {
      valid: false,
      error: "Please enter the full name of the primary account holder.",
    };
  }

  const holderEmail = typeof input.holderEmail === "string" ? input.holderEmail.trim() : "";
  const holderBirthDate =
    typeof input.holderBirthDate === "string" ? input.holderBirthDate.trim() : "";
  const holderAge = holderBirthDate ? calculateAgeFromBirthDate(holderBirthDate) : null;

  if (holderAge === null || holderAge > 120) {
    return {
      valid: false,
      error: "Please enter a valid birth date for the primary account holder.",
    };
  }

  if (holderAge < FAMILY_AND_FRIENDS_MIN_HOLDER_AGE) {
    return {
      valid: false,
      error:
        "The primary account holder for the Family and Friends plan must be at least 18 years old.",
    };
  }

  if (input.holderAgeConfirmed !== true) {
    return {
      valid: false,
      error: "Please confirm that the primary account holder is at least 18 years old.",
    };
  }

  const rawMembers = Array.isArray(input.members) ? input.members : [];
  const cleanedMembers = rawMembers
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  if (cleanedMembers.length > FAMILY_AND_FRIENDS_MAX_MEMBERS - 1) {
    return {
      valid: false,
      error:
        "Family and Friends accommodates up to 4 different people in total (1 titular and up to 3 additional members).",
    };
  }

  const seenIdentifiers = new Set<string>([holderName.toLowerCase()]);
  if (holderEmail) {
    seenIdentifiers.add(holderEmail.toLowerCase());
  }

  for (const member of cleanedMembers) {
    const normalized = member.toLowerCase();
    if (seenIdentifiers.has(normalized)) {
      return {
        valid: false,
        error:
          "All people in the Family and Friends plan must be different (no duplicate names or emails).",
      };
    }
    seenIdentifiers.add(normalized);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member)) {
      return { valid: false, error: "Family members must be registered reader email addresses." };
    }
  }

  return {
    valid: true,
    holderAge,
    cleanedMembers,
  };
}
