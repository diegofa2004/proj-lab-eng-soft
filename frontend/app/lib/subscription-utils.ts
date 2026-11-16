export type SubscriptionPeriodicity = "mensal" | "anual";

export type SubscriptionStatus = "pendente" | "ativa" | "cancelada" | "expirada";

export type PaymentStatus = "pendente" | "aprovado" | "recusado" | "estornado";

export type SubscriptionPlan = {
  id_plano: number;
  nome: string;
  preco: string | number;
  moeda: string;
  periodicidade: SubscriptionPeriodicity;
  ativo: boolean;
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

export const DEFAULT_PREMIUM_PLAN: SubscriptionPlan = {
  id_plano: 1,
  nome: "LivrUSP Premium",
  preco: "9.90",
  moeda: "BRL",
  periodicidade: "mensal",
  ativo: true,
};

/** Resolves the single LivrUSP Premium plan shown in checkout, falling back to the default plan definition. */
export function resolvePremiumPlan(plans: SubscriptionPlan[]): SubscriptionPlan {
  return plans[0] ?? DEFAULT_PREMIUM_PLAN;
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
