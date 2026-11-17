"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useMemo, useState } from "react";

import { formatProfileLevel, type UserProfile } from "@/app/lib/profile-utils";
import {
  DEFAULT_FAMILY_AND_FRIENDS_PLAN,
  DEFAULT_INDIVIDUAL_PLAN,
  FAMILY_AND_FRIENDS_MAX_MEMBERS,
  FAMILY_AND_FRIENDS_MIN_HOLDER_AGE,
  PREMIUM_BENEFITS,
  calculateAgeFromBirthDate,
  formatCycleDuration,
  formatPaymentStatus,
  formatPerPersonPrice,
  formatPeriodicity,
  formatPeriodicityInterval,
  formatPlanPrice,
  formatSubscriptionDate,
  formatSubscriptionStatus,
  getActiveSubscription,
  isFamilyAndFriendsPlan,
  resolvePremiumPlans,
  validateFamilyAndFriendsCheckout,
  type BillingConfig,
  type CheckoutResponse,
  type FamilyPlanHolderDetails,
  type PaymentRecord,
  type Subscription,
  type SubscriptionPlan,
} from "@/app/lib/subscription-utils";
import { card, cardInset, cardInsetMuted, dangerCompact } from "@/app/lib/ui";

type RequestStatus = "idle" | "submitting" | "success" | "error";

type SubscriptionCheckoutProps = {
  initialProfile: UserProfile;
  initialBillingConfig: BillingConfig;
  initialPlans: SubscriptionPlan[];
  initialSubscriptions: Subscription[];
  initialPayments: PaymentRecord[];
  /** "plans" shows the plan cards; "form" shows the subscription form for the chosen plan. */
  view?: "plans" | "form";
  initialPlanId?: number | null;
};

type DisplayedReceipt = {
  subscription: Subscription;
  payment: PaymentRecord | null;
};

const labelClassName =
  "block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]";
const fieldClassName =
  "mt-1.5 block w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black shadow-2xs outline-none transition placeholder:text-black/40 hover:border-[#1E2E4F]/50 focus:border-[#1E2E4F] focus:ring-2 focus:ring-[#82A7D5]/50";

function mergeSubscription(list: Subscription[], item: Subscription): Subscription[] {
  const withoutCurrent = list.filter(
    (existing) => existing.id_assinatura !== item.id_assinatura,
  );
  return [item, ...withoutCurrent].sort((a, b) => b.id_assinatura - a.id_assinatura);
}

function mergePayment(list: PaymentRecord[], item: PaymentRecord): PaymentRecord[] {
  const withoutCurrent = list.filter((existing) => existing.id_pagamento !== item.id_pagamento);
  return [item, ...withoutCurrent].sort((a, b) => b.id_pagamento - a.id_pagamento);
}

function extractErrorDetail(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const record = data as { detail?: unknown };
  if (typeof record.detail === "string" && record.detail.trim().length > 0) {
    return record.detail;
  }

  if (Array.isArray(record.detail) && record.detail.length > 0) {
    const messages = record.detail
      .map((entry) => {
        if (entry && typeof entry === "object" && "msg" in entry) {
          return String((entry as { msg: unknown }).msg);
        }
        return null;
      })
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

export default function SubscriptionCheckout({
  initialProfile,
  initialBillingConfig,
  initialPlans,
  initialSubscriptions,
  initialPayments,
  view = "plans",
  initialPlanId = null,
}: SubscriptionCheckoutProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [isPremium, setIsPremium] = useState<boolean>(
    initialProfile.is_premium || Boolean(getActiveSubscription(initialSubscriptions)),
  );
  const [cancelledInSession, setCancelledInSession] = useState<boolean>(false);

  const availablePlans = useMemo(() => resolvePremiumPlans(initialPlans), [initialPlans]);
  const individualPlan =
    availablePlans.find((plan) => plan.tier === "individual") ?? DEFAULT_INDIVIDUAL_PLAN;
  const familyPlan =
    availablePlans.find((plan) => plan.tier === "family_and_friends") ??
    DEFAULT_FAMILY_AND_FRIENDS_PLAN;

  const initialActiveSubscription = getActiveSubscription(initialSubscriptions);
  const requestedPlan =
    initialPlanId !== null
      ? availablePlans.find((plan) => plan.id_plano === initialPlanId)
      : undefined;
  const initialDefaultPlanId = requestedPlan
    ? requestedPlan.id_plano
    : initialActiveSubscription &&
        availablePlans.some((plan) => plan.id_plano === initialActiveSubscription.id_plano)
      ? initialActiveSubscription.id_plano
      : (availablePlans[0]?.id_plano ?? individualPlan.id_plano);

  const [selectedPlanId, setSelectedPlanId] = useState<number>(initialDefaultPlanId);
  const [subscribedPlanOverride, setSubscribedPlanOverride] =
    useState<SubscriptionPlan | null>(null);
  const [savedFamilyDetails, setSavedFamilyDetails] =
    useState<FamilyPlanHolderDetails | null>(null);

  const [holderName, setHolderName] = useState<string>(initialProfile.nome_perfil);
  const [holderBirthDate, setHolderBirthDate] = useState<string>("");
  const [holderAgeConfirmed, setHolderAgeConfirmed] = useState<boolean>(false);
  const [familyMembers, setFamilyMembers] = useState<[string, string, string]>(["", "", ""]);

  const [checkoutStatus, setCheckoutStatus] = useState<RequestStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [latestCheckoutReceipt, setLatestCheckoutReceipt] = useState<DisplayedReceipt | null>(
    null,
  );

  const plansById = useMemo(() => {
    const map = new Map<number, SubscriptionPlan>();
    for (const plan of initialPlans) {
      map.set(plan.id_plano, plan);
    }
    for (const plan of availablePlans) {
      map.set(plan.id_plano, plan);
    }
    return map;
  }, [availablePlans, initialPlans]);

  const selectedPlan =
    availablePlans.find((plan) => plan.id_plano === selectedPlanId) ??
    availablePlans[0] ??
    individualPlan;
  const isFamilyPlanSelected = isFamilyAndFriendsPlan(selectedPlan);

  const activeSubscription = useMemo(
    () => getActiveSubscription(subscriptions),
    [subscriptions],
  );

  const activePlan = activeSubscription
    ? (subscribedPlanOverride ??
      plansById.get(activeSubscription.id_plano) ??
      individualPlan)
    : null;

  const effectiveActivePlanId =
    subscribedPlanOverride?.id_plano ?? activeSubscription?.id_plano ?? null;

  const isSameActivePlan = Boolean(
    activeSubscription && effectiveActivePlanId === selectedPlan.id_plano,
  );
  const isSwitchingPlan = Boolean(
    activeSubscription && effectiveActivePlanId !== selectedPlan.id_plano,
  );

  const holderAge = useMemo(
    () => (holderBirthDate ? calculateAgeFromBirthDate(holderBirthDate) : null),
    [holderBirthDate],
  );
  const isHolderAdult = holderAge !== null && holderAge >= FAMILY_AND_FRIENDS_MIN_HOLDER_AGE && holderAge <= 120;
  const isHolderUnderage = holderAge !== null && holderAge < FAMILY_AND_FRIENDS_MIN_HOLDER_AGE;

  const filledExtraMembers = useMemo(
    () => familyMembers.map((member) => member.trim()).filter(Boolean),
    [familyMembers],
  );
  const totalPlannedPeople = 1 + filledExtraMembers.length;

  const perPersonIndividualLabel = formatPlanPrice(individualPlan.preco, individualPlan.moeda);
  const perPersonFamilyWithFourLabel = formatPerPersonPrice(
    familyPlan.preco,
    familyPlan.moeda,
    FAMILY_AND_FRIENDS_MAX_MEMBERS,
  );

  const displayedReceipt = useMemo<DisplayedReceipt | null>(() => {
    if (latestCheckoutReceipt) {
      return latestCheckoutReceipt;
    }
    if (!activeSubscription) {
      return null;
    }
    const matchingPayment =
      payments.find(
        (payment) =>
          payment.id_assinatura === activeSubscription.id_assinatura &&
          payment.status === "aprovado",
      ) ??
      payments.find((payment) => payment.id_assinatura === activeSubscription.id_assinatura) ??
      null;
    if (!matchingPayment) {
      return null;
    }
    return {
      subscription: activeSubscription,
      payment: matchingPayment,
    };
  }, [activeSubscription, latestCheckoutReceipt, payments]);

  const isSubmitting = checkoutStatus === "submitting";
  const canPublish = isPremium || (!cancelledInSession && initialProfile.pode_publicar);

  function handleSelectPlan(plan: SubscriptionPlan) {
    setSelectedPlanId(plan.id_plano);
    if (checkoutStatus === "error" || checkoutStatus === "success") {
      setCheckoutStatus("idle");
      setFeedbackMessage("");
    }
  }

  function handleMemberChange(index: 0 | 1 | 2, value: string) {
    setFamilyMembers((prev) => {
      const next: [string, string, string] = [prev[0], prev[1], prev[2]];
      next[index] = value;
      return next;
    });
  }

  async function refreshSubscriptionState() {
    const response = await fetch("/api/subscription", { cache: "no-store" }).catch(() => null);
    if (!response || !response.ok) {
      return;
    }

    const data = (await response.json().catch(() => null)) as {
      subscriptions?: Subscription[];
      payments?: PaymentRecord[];
    } | null;

    if (data?.subscriptions && Array.isArray(data.subscriptions)) {
      setSubscriptions(data.subscriptions);
      setIsPremium(Boolean(getActiveSubscription(data.subscriptions)));
    }
    if (data?.payments && Array.isArray(data.payments)) {
      setPayments(data.payments);
    }
  }

  async function handleCheckout(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (availablePlans.length === 0 || isSwitchingPlan || isSubmitting || cancellingId !== null) {
      return;
    }

    let cleanedMembers: string[] = [];
    if (isFamilyPlanSelected) {
      const validation = validateFamilyAndFriendsCheckout({
        holderName,
        holderEmail: initialProfile.email,
        holderBirthDate,
        holderAgeConfirmed,
        members: familyMembers,
      });

      if (!validation.valid) {
        setCheckoutStatus("error");
        setFeedbackMessage(validation.error);
        return;
      }

      cleanedMembers = validation.cleanedMembers;
    }

    setCheckoutStatus("submitting");
    setFeedbackMessage("");

    const payload = isFamilyPlanSelected
      ? {
          id_plano: selectedPlan.id_plano,
          holder_birth_date: holderBirthDate.trim(),
          holder_age_confirmed: holderAgeConfirmed,
          member_emails: cleanedMembers,
        }
      : {
          id_plano: selectedPlan.id_plano,
        };

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | (Partial<CheckoutResponse> & { status?: string; plan?: string; detail?: unknown })
        | null;

      if (!response.ok) {
        setCheckoutStatus("error");
        setFeedbackMessage(
          extractErrorDetail(
            data,
            "Could not complete subscription checkout. Please try again.",
          ),
        );
        return;
      }

      setSubscribedPlanOverride(selectedPlan);
      if (isFamilyPlanSelected) {
        setSavedFamilyDetails({
          holderName: holderName.trim(),
          holderEmail: initialProfile.email,
          holderBirthDate: holderBirthDate.trim(),
          holderAgeConfirmed,
          members: cleanedMembers,
        });
      } else {
        setSavedFamilyDetails(null);
      }

      if (data && data.subscription) {
        const nextSubscriptions = mergeSubscription(subscriptions, data.subscription);
        setSubscriptions(nextSubscriptions);
        setIsPremium(data.subscription.status === "ativa");
        setCancelledInSession(false);

        if (data.payment) {
          setPayments((prev) => mergePayment(prev, data.payment as PaymentRecord));
        }

        setLatestCheckoutReceipt({
          subscription: data.subscription,
          payment: data.payment ?? null,
        });
        setCheckoutStatus("success");
        setFeedbackMessage(
          isSameActivePlan
            ? "Your active Premium subscription and payment confirmation are up to date."
            : `${selectedPlan.nome} is now active! You can publish books immediately.`,
        );
      } else {
        setIsPremium(true);
        setCancelledInSession(false);
        await refreshSubscriptionState();
        setCheckoutStatus("success");
        setFeedbackMessage(
          `${selectedPlan.nome} is now active! You can publish books immediately.`,
        );
      }

      router.refresh();
    } catch {
      setCheckoutStatus("error");
      setFeedbackMessage("Unable to reach the subscription service. Please try again.");
    }
  }

  async function handleCancelSubscription(subscriptionId: number) {
    if (isSubmitting || cancellingId !== null) {
      return;
    }

    setCancellingId(subscriptionId);
    setFeedbackMessage("");
    if (checkoutStatus === "error" || checkoutStatus === "success") {
      setCheckoutStatus("idle");
    }

    try {
      const response = await fetch(`/api/subscription/${subscriptionId}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => null)) as
        | (Subscription & { detail?: unknown })
        | { detail?: unknown }
        | null;

      if (!response.ok) {
        setCheckoutStatus("error");
        setFeedbackMessage(
          extractErrorDetail(
            data,
            "Could not cancel your subscription. Please try again.",
          ),
        );
        return;
      }

      const updatedSubscriptions =
        data && "id_assinatura" in data
          ? mergeSubscription(subscriptions, data)
          : subscriptions.map((item) =>
              item.id_assinatura === subscriptionId
                ? { ...item, status: "cancelada" as const }
                : item,
            );

      setSubscriptions(updatedSubscriptions);
      setIsPremium(Boolean(getActiveSubscription(updatedSubscriptions)));
      setCancelledInSession(true);
      setSubscribedPlanOverride(null);
      setSavedFamilyDetails(null);
      setLatestCheckoutReceipt(null);
      setCheckoutStatus("success");
      setFeedbackMessage(
        "Your subscription has been cancelled and Premium access has ended immediately.",
      );
      router.refresh();
    } catch {
      setCheckoutStatus("error");
      setFeedbackMessage("Unable to reach the subscription service. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      {/* Left Column: Reader Membership & Benefits */}
      <aside aria-label="Reader membership overview" className="space-y-6 lg:col-span-5">
        <section className={`${card} p-6 sm:p-8`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
              Membership Overview
            </span>
            {isPremium ? (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-100/90 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                ★ Premium Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-3 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-black/65">
                Standard Plan
              </span>
            )}
          </div>

          <div className="mt-5">
            <h2 className="truncate font-serif text-3xl leading-tight font-normal tracking-tight text-black sm:text-4xl">
              {initialProfile.nome_perfil}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-black/60">
              {initialProfile.email}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                Level · {formatProfileLevel(initialProfile.nivel)} ({initialProfile.pontos_leitura}{" "}
                pts)
              </span>
              {isPremium ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-100/90 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                  ★ Premium
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-black/65">
                  Free Reader
                </span>
              )}
              {canPublish ? (
                <span className="inline-flex items-center rounded-full border border-[#556B45]/30 bg-[#556B45]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3A4B2E]">
                  Publisher
                </span>
              ) : null}
              {initialProfile.is_admin ? (
                <span className="inline-flex items-center rounded-full border border-[#1E2E4F] bg-[#1E2E4F] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
                  Admin
                </span>
              ) : null}
            </div>
          </div>

          {/* Current Subscription Status Box */}
          <div className={`mt-6 p-4 ${cardInset}`}>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
              Current Subscription
            </span>

            {activeSubscription ? (
              <div className="mt-2 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-2xl leading-tight text-black">
                      {activePlan ? activePlan.nome : `Plan #${activeSubscription.id_plano}`}
                    </p>
                    {activePlan ? (
                      <p className="mt-0.5 text-xs font-medium text-black/65">
                        {formatPeriodicity(activePlan.periodicidade)} ·{" "}
                        {formatPlanPrice(activePlan.preco, activePlan.moeda)}{" "}
                        {formatPeriodicityInterval(activePlan.periodicidade)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${formatSubscriptionStatus(activeSubscription.status).badgeClassName}`}
                  >
                    {formatSubscriptionStatus(activeSubscription.status).label}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-2 border-t border-black/10 pt-3 text-xs">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                      Started
                    </dt>
                    <dd className="mt-0.5 font-medium text-black">
                      {formatSubscriptionDate(activeSubscription.inicio)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                      Valid through
                    </dt>
                    <dd className="mt-0.5 font-medium text-black">
                      {formatSubscriptionDate(activeSubscription.fim)}
                    </dd>
                  </div>
                  {savedFamilyDetails && activePlan && isFamilyAndFriendsPlan(activePlan) ? (
                    <>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                          Primary Holder (18+)
                        </dt>
                        <dd className="mt-0.5 font-medium text-black">
                          {savedFamilyDetails.holderName}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                          Covered People
                        </dt>
                        <dd className="mt-0.5 font-medium text-black">
                          {1 + savedFamilyDetails.members.length} of{" "}
                          {FAMILY_AND_FRIENDS_MAX_MEMBERS} slots
                        </dd>
                      </div>
                    </>
                  ) : null}
                  {activeSubscription.referencia_provedor ? (
                    <div className="col-span-2">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                        Reference
                      </dt>
                      <dd className="mt-0.5 font-mono text-[11px] text-[#1E2E4F]">
                        {activeSubscription.referencia_provedor}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="border-t border-black/10 pt-3">
                  <button
                    className={dangerCompact}
                    disabled={cancellingId !== null || isSubmitting}
                    onClick={() => handleCancelSubscription(activeSubscription.id_assinatura)}
                    type="button"
                  >
                    {cancellingId === activeSubscription.id_assinatura
                      ? "Cancelling..."
                      : "Cancel subscription"}
                  </button>
                  <p className="mt-2 text-[11px] leading-relaxed text-black/55">
                    Cancelling ends your Premium access immediately.
                  </p>
                </div>
              </div>
            ) : isPremium ? (
              <p className="mt-2 text-sm leading-relaxed text-black/75">
                Your account currently has an active Premium membership.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-black/65">
                You are currently on the free Standard Plan. Subscribe to LivrUSP Premium
                (Individual or Family and Friends) to immediately unlock book publishing rights and
                exclusive profile cosmetics.
              </p>
            )}
          </div>

          {/* Premium Benefits */}
          <div className="mt-6 border-t border-black/10 pt-5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
              Included with Premium
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-black/60">
              Both the Individual and Family and Friends plans provide the exact same Premium
              benefits for every member.
            </p>
            <ul className="mt-3 space-y-3">
              {PREMIUM_BENEFITS.map((benefit) => (
                <li className="flex items-start gap-2.5 text-sm" key={benefit.title}>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#556B45]/15 font-mono text-[11px] font-bold text-[#3A4B2E]"
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-black">{benefit.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-black/60">
                      {benefit.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5">
            <Link
              className="text-xs font-semibold text-[#1E2E4F] transition hover:underline sm:text-sm"
              href="/profile"
            >
              ← Back to profile
            </Link>
            <Link
              className="text-xs font-semibold text-[#1E2E4F] transition hover:underline sm:text-sm"
              href="/library"
            >
              Open my library →
            </Link>
          </div>
        </section>
      </aside>

      {/* Right Column: Plan Selection, Checkout & History */}
      <div className="space-y-8 lg:col-span-7">
        {/* Checkout Card */}
        <section
          aria-labelledby="subscription-checkout-heading"
          className={`${card} p-6 sm:p-8`}
        >
          <div className="border-b border-black/10 pb-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
              {view === "form" ? "Subscribe now" : "Subscription Checkout"}
            </p>
            <h2
              className="mt-2 font-serif text-3xl font-normal tracking-tight text-black sm:text-4xl"
              id="subscription-checkout-heading"
            >
              {view === "form" ? selectedPlan.nome : "LivrUSP Premium plans"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-black/65">
              {view === "form"
                ? "Review your order and fill in the details below to activate your Premium subscription."
                : "Select the Individual plan for one reader or the Family and Friends plan for up to 4 different people at a lower cost per person. Both plans include the exact same Premium benefits."}
            </p>
          </div>

          {/* Billing Mode Notice Banner */}
          <div className="mt-6">
            {initialBillingConfig.demo_billing ? (
              <div className="rounded-2xl border border-[#1E2E4F]/15 bg-[#D9E1F1]/70 p-4 text-xs leading-relaxed text-[#1E2E4F] sm:text-sm">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                  Local Demo Billing Active
                </p>
                <p className="mt-1">
                  Payment mode is a local simulation. No credit card or personal payment
                  information is requested or charged. Confirming activates your Premium
                  subscription directly on the server.
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl border border-amber-500/35 bg-amber-50/90 p-4 text-xs leading-relaxed text-amber-950 sm:text-sm"
                role="status"
              >
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-900">
                  Demo Billing Disabled
                </p>
                <p className="mt-1">
                  No external payment provider is configured and local demo billing is turned off
                  on the server. Checkout requests will return an unavailable status (503) until
                  billing is enabled.
                </p>
              </div>
            )}
          </div>

          <form className="mt-6 space-y-6" noValidate onSubmit={handleCheckout}>
            {/* Two-Plan Selector */}
            {view === "plans" ? (
            <div>
              <span className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
                Choose Your Plan
              </span>

              <div
                aria-label="Choose a Premium plan"
                className="mt-3 grid gap-4 sm:grid-cols-2"
                role="radiogroup"
              >
                {availablePlans.map((plan) => {
                  const isFamily = isFamilyAndFriendsPlan(plan);
                  const isSelected = selectedPlan.id_plano === plan.id_plano;
                  const isCurrentActive = Boolean(
                    activeSubscription && effectiveActivePlanId === plan.id_plano,
                  );

                  return (
                    <button
                      aria-checked={isSelected}
                      className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2E4F] ${
                        isSelected
                          ? "border-[#1E2E4F] bg-white ring-2 ring-[#1E2E4F]/15 shadow-xs"
                          : "border-black/15 bg-white/75 hover:border-[#1E2E4F]/45 hover:bg-white"
                      }`}
                      key={plan.id_plano}
                      onClick={() => handleSelectPlan(plan)}
                      role="radio"
                      type="button"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-[#1E2E4F]/20 bg-[#D9E1F1] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                            {formatPeriodicity(plan.periodicidade)}
                          </span>
                          <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black/75">
                            {isFamily ? `Up to ${FAMILY_AND_FRIENDS_MAX_MEMBERS} people` : "1 person"}
                          </span>
                          {isCurrentActive ? (
                            <span className="rounded-full border border-[#556B45]/30 bg-[#556B45]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3A4B2E]">
                              Active
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 font-serif text-2xl leading-snug font-normal text-black">
                          {plan.nome}
                        </h3>

                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="font-serif text-3xl leading-none tracking-tight text-black">
                            {formatPlanPrice(plan.preco, plan.moeda)}
                          </span>
                          <span className="font-mono text-[11px] text-[#556B45]">
                            {formatPeriodicityInterval(plan.periodicidade)}
                          </span>
                        </div>

                        {isFamily ? (
                          <p className="mt-2.5 rounded-xl border border-[#556B45]/25 bg-[#556B45]/10 px-3 py-2 text-xs leading-relaxed text-[#3A4B2E]">
                            <strong>{perPersonFamilyWithFourLabel} / person</strong> with 4 people
                            (cheaper than {perPersonIndividualLabel} on Individual)
                          </p>
                        ) : (
                          <p className="mt-2.5 rounded-xl border border-[#1E2E4F]/15 bg-[#D9E1F1]/55 px-3 py-2 text-xs leading-relaxed text-[#1E2E4F]">
                            <strong>{perPersonIndividualLabel} / person</strong> · Single reader
                            account
                          </p>
                        )}

                        <p className="mt-3 text-xs leading-relaxed text-black/65">
                          {plan.description}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-black/10 pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono uppercase tracking-wider text-black/60">
                            {isFamily ? "Adult holder (18+) required" : "No group setup needed"}
                          </span>
                          <span
                            className={`font-semibold ${
                              isSelected ? "text-[#1E2E4F]" : "text-black/50"
                            }`}
                          >
                            {isSelected ? "Selected ✓" : "Select plan"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5">
                <button
                  className="rounded-full bg-[#1E2E4F] px-7 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15223B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2E4F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  disabled={isSwitchingPlan || cancellingId !== null}
                  onClick={() =>
                    router.push(`/subscription/checkout?plan=${selectedPlan.id_plano}`)
                  }
                  type="button"
                >
                  Subscribe now
                </button>

                <p
                  aria-live="polite"
                  className={`text-sm font-medium ${
                    checkoutStatus === "error" ? "text-red-700" : "text-[#3A4B2E]"
                  }`}
                  role={checkoutStatus === "error" ? "alert" : "status"}
                >
                  {feedbackMessage}
                </p>
              </div>

              {isSwitchingPlan && activeSubscription ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-50 px-3.5 py-3 text-xs text-amber-950">
                  <p className="leading-relaxed">
                    Cancel your current active plan before switching to{" "}
                    <strong>{selectedPlan.nome}</strong>.
                  </p>
                  <button
                    className={dangerCompact}
                    disabled={cancellingId !== null || isSubmitting}
                    onClick={() => handleCancelSubscription(activeSubscription.id_assinatura)}
                    type="button"
                  >
                    {cancellingId === activeSubscription.id_assinatura
                      ? "Cancelling..."
                      : "Cancel current plan"}
                  </button>
                </div>
              ) : null}
            </div>
            ) : null}

            {/* Family & Friends Holder (18+) & Group Members Setup */}
            {view === "form" && isFamilyPlanSelected ? (
              <div className={`space-y-5 p-5 ${cardInset}`}>
                <div className="border-b border-black/10 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
                      Family and Friends · Holder &amp; Members
                    </span>
                    <span className="rounded-full border border-amber-500/30 bg-amber-100/90 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                      Adult holder required
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-black/65">
                    The Family and Friends plan requires a primary account holder who is
                    at least <strong>{FAMILY_AND_FRIENDS_MIN_HOLDER_AGE} years old</strong> and
                    covers up to <strong>{FAMILY_AND_FRIENDS_MAX_MEMBERS} different people</strong>{" "}
                    with the exact same Premium benefits.
                  </p>
                </div>

                {/* Primary Holder */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClassName} htmlFor="family-holder-name">
                      Primary Holder Name
                    </label>
                    <input
                      className={fieldClassName}
                      id="family-holder-name"
                      onChange={(event) => setHolderName(event.target.value)}
                      placeholder="Full name of primary holder"
                      required
                      type="text"
                      value={holderName}
                    />
                  </div>

                  <div>
                    <label className={labelClassName} htmlFor="family-holder-birthdate">
                      Primary Holder Date of Birth (18+ Required)
                    </label>
                    <input
                      className={fieldClassName}
                      id="family-holder-birthdate"
                      onChange={(event) => setHolderBirthDate(event.target.value)}
                      required
                      type="date"
                      value={holderBirthDate}
                    />
                    {isHolderAdult ? (
                      <p className="mt-1.5 inline-flex items-center rounded-full border border-[#556B45]/30 bg-[#556B45]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3A4B2E]">
                        Age {holderAge} · Adult holder verified (18+)
                      </p>
                    ) : isHolderUnderage ? (
                      <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">
                        Holder is {holderAge} years old. Must be at least 18 years old.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-black/55">
                        Primary holder must be at least {FAMILY_AND_FRIENDS_MIN_HOLDER_AGE} years
                        old.
                      </p>
                    )}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white/80 p-3.5 text-xs leading-relaxed text-black/80">
                  <input
                    checked={holderAgeConfirmed}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/25 text-[#1E2E4F] focus:ring-[#1E2E4F]"
                    id="family-holder-age-confirmed"
                    onChange={(event) => setHolderAgeConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I confirm that the primary account holder is <strong>at least 18 years old</strong> and responsible for
                    managing the up to 4 different people included in this Family and Friends plan.
                  </span>
                </label>

                {/* Up to 4 Different People */}
                <div className="border-t border-black/10 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={labelClassName}>
                      Plan Members ({totalPlannedPeople} / {FAMILY_AND_FRIENDS_MAX_MEMBERS}{" "}
                      different people)
                    </span>
                    <span className="font-mono text-[11px] text-[#556B45]">
                      {perPersonFamilyWithFourLabel} / person with 4 members
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-black/60">
                    The primary holder counts as person #1. Optionally list up to 3 additional registered
                    reader email addresses. You can include fewer than 4 now, or fill all 4
                    slots.
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#1E2E4F]/20 bg-[#D9E1F1]/45 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1E2E4F]">
                          Person 1 · Primary Holder (18+)
                        </span>
                        <span className="font-mono text-[10px] text-[#556B45]">Included</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-black">
                        {holderName.trim() || initialProfile.nome_perfil}
                      </p>
                      <p className="truncate font-mono text-[11px] text-black/55">
                        {initialProfile.email}
                      </p>
                    </div>

                    {([0, 1, 2] as const).map((slotIndex) => (
                      <div key={slotIndex}>
                        <label
                          className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-black/60"
                          htmlFor={`family-member-${slotIndex + 2}`}
                        >
                          Person {slotIndex + 2} (Optional)
                        </label>
                        <input
                          className={fieldClassName}
                          id={`family-member-${slotIndex + 2}`}
                          onChange={(event) => handleMemberChange(slotIndex, event.target.value)}
                          placeholder="Registered reader email"
                          type="email"
                          value={familyMembers[slotIndex]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Checkout Summary */}
            {view === "form" ? (
            <>
            <div className={`space-y-3 p-5 ${cardInset}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
                  Order Summary
                </span>
                <Link
                  className="text-xs font-semibold text-[#1E2E4F] transition hover:underline"
                  href="/subscription"
                >
                  ← Change plan
                </Link>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Selected Plan
                  </dt>
                  <dd className="mt-0.5 font-semibold text-black">{selectedPlan.nome}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Billing Cycle
                  </dt>
                  <dd className="mt-0.5 font-medium text-black">
                    {formatPeriodicity(selectedPlan.periodicidade)} (
                    {formatCycleDuration(selectedPlan.periodicidade)})
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    People Covered
                  </dt>
                  <dd className="mt-0.5 text-xs font-medium text-black/80">
                    {isFamilyPlanSelected
                      ? `Up to ${FAMILY_AND_FRIENDS_MAX_MEMBERS} different people (${totalPlannedPeople} set now)`
                      : "1 reader (Individual account)"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Price per Person
                  </dt>
                  <dd className="mt-0.5 text-xs font-medium text-black/80">
                    {isFamilyPlanSelected
                      ? `${perPersonFamilyWithFourLabel} / person with 4 people (vs. ${perPersonIndividualLabel} Individual)`
                      : `${perPersonIndividualLabel} / person`}
                  </dd>
                </div>
                {isFamilyPlanSelected ? (
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                      Primary Holder (18+)
                    </dt>
                    <dd className="mt-0.5 text-xs font-medium text-black/80">
                      {holderName.trim() || "Name required"} ·{" "}
                      {isHolderAdult
                        ? `${holderAge} yrs (18+ verified)`
                        : isHolderUnderage
                          ? `${holderAge} yrs (Must be 18+)`
                          : "Birth date required"}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Total Due
                  </dt>
                  <dd className="mt-0.5 font-semibold text-black">
                    {formatPlanPrice(selectedPlan.preco, selectedPlan.moeda)}{" "}
                    <span className="font-mono text-xs font-normal text-black/55">
                      ({selectedPlan.moeda} {formatPeriodicityInterval(selectedPlan.periodicidade)})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Included Benefits
                  </dt>
                  <dd className="mt-0.5 text-xs font-medium text-black/75">
                    Identical across both plans: instant book publishing &amp; Premium cosmetics
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Payment Method
                  </dt>
                  <dd className="mt-0.5 text-xs font-medium text-black/75">
                    Simulated server checkout · No card required
                  </dd>
                </div>
              </dl>

              {isSwitchingPlan && activeSubscription ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-50 px-3.5 py-3 text-xs text-amber-950">
                  <p className="leading-relaxed">
                    Cancel your current active plan before switching to{" "}
                    <strong>{selectedPlan.nome}</strong>.
                  </p>
                  <button
                    className={dangerCompact}
                    disabled={cancellingId !== null || isSubmitting}
                    onClick={() => handleCancelSubscription(activeSubscription.id_assinatura)}
                    type="button"
                  >
                    {cancellingId === activeSubscription.id_assinatura
                      ? "Cancelling..."
                      : "Cancel current plan"}
                  </button>
                </div>
              ) : null}

              {isSameActivePlan ? (
                <p className="rounded-xl border border-[#556B45]/25 bg-[#556B45]/10 px-3.5 py-2.5 text-xs leading-relaxed text-[#3A4B2E]">
                  Your <strong>{selectedPlan.nome}</strong> is already active on this account,
                  including book publishing permissions. Reconfirming checkout returns your existing
                  payment confirmation without double-charging.
                </p>
              ) : null}
            </div>

            {/* Submit & Feedback */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5">
              <button
                className="rounded-full bg-[#1E2E4F] px-7 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15223B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2E4F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                disabled={
                  availablePlans.length === 0 || isSubmitting || isSwitchingPlan || cancellingId !== null
                }
                type="submit"
              >
                {isSubmitting
                  ? "Processing checkout..."
                  : isSameActivePlan
                    ? "Reconfirm active plan"
                    : isFamilyPlanSelected
                      ? "Subscribe to Family & Friends"
                      : "Subscribe to Individual"}
              </button>

              <p
                aria-live="polite"
                className={`text-sm font-medium ${
                  checkoutStatus === "error" ? "text-red-700" : "text-[#3A4B2E]"
                }`}
                role={checkoutStatus === "error" ? "alert" : "status"}
              >
                {feedbackMessage}
              </p>
              {checkoutStatus === "success" ? (
                <Link
                  className="text-xs font-semibold text-[#1E2E4F] transition hover:underline sm:text-sm"
                  href="/subscription"
                >
                  View my membership →
                </Link>
              ) : null}
            </div>
            </>
            ) : null}
          </form>

          {/* Latest Payment Confirmation Receipt */}
          {displayedReceipt ? (
            <div className={`mt-6 p-5 ${cardInsetMuted}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#556B45]">
                  Latest Payment Confirmation
                </span>
                {displayedReceipt.payment ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${formatPaymentStatus(displayedReceipt.payment.status).badgeClassName}`}
                  >
                    {formatPaymentStatus(displayedReceipt.payment.status).label}
                  </span>
                ) : null}
              </div>

              <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Reference
                  </dt>
                  <dd className="mt-0.5 font-mono font-semibold text-[#1E2E4F]">
                    {displayedReceipt.payment?.referencia_provedor ??
                      displayedReceipt.subscription.referencia_provedor ??
                      `SUB-${displayedReceipt.subscription.id_assinatura}`}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Amount
                  </dt>
                  <dd className="mt-0.5 font-semibold text-black">
                    {subscribedPlanOverride && isFamilyAndFriendsPlan(subscribedPlanOverride)
                      ? formatPlanPrice(
                          subscribedPlanOverride.preco,
                          subscribedPlanOverride.moeda,
                        )
                      : displayedReceipt.payment
                        ? formatPlanPrice(
                            displayedReceipt.payment.valor,
                            displayedReceipt.payment.moeda,
                          )
                        : "Confirmed"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Confirmed On
                  </dt>
                  <dd className="mt-0.5 text-black">
                    {formatSubscriptionDate(
                      displayedReceipt.payment?.data_hora ?? displayedReceipt.subscription.inicio,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-black/50">
                    Access Window
                  </dt>
                  <dd className="mt-0.5 text-black">
                    {formatSubscriptionDate(displayedReceipt.subscription.inicio)} –{" "}
                    {formatSubscriptionDate(displayedReceipt.subscription.fim)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>

        {/* Subscription & Payment History Card */}
        {view === "plans" ? (
        <section
          aria-labelledby="subscription-history-heading"
          className={`${card} p-6 sm:p-8`}
        >
          <div className="border-b border-black/10 pb-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
              Billing Records
            </p>
            <h2
              className="mt-2 font-serif text-3xl font-normal tracking-tight text-black"
              id="subscription-history-heading"
            >
              Subscriptions &amp; payments
            </h2>
          </div>

          <div className="mt-6 space-y-8">
            {/* Recent Subscriptions */}
            <div>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
                Recent Subscriptions
              </h3>

              {subscriptions.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {subscriptions.map((subscription) => {
                    const isLatestActiveOverride =
                      activeSubscription?.id_assinatura === subscription.id_assinatura &&
                      subscribedPlanOverride;
                    const plan = isLatestActiveOverride
                      ? subscribedPlanOverride
                      : plansById.get(subscription.id_plano);
                    const statusBadge = formatSubscriptionStatus(subscription.status);
                    const canCancel =
                      subscription.status === "ativa" || subscription.status === "pendente";

                    return (
                      <li
                        className={`flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center ${cardInset}`}
                        key={subscription.id_assinatura}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-serif text-xl text-black">
                              {plan ? plan.nome : `Plan #${subscription.id_plano}`}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusBadge.badgeClassName}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-black/60">
                            Subscription #{subscription.id_assinatura} ·{" "}
                            {formatSubscriptionDate(subscription.inicio)} –{" "}
                            {formatSubscriptionDate(subscription.fim)}
                            {subscription.referencia_provedor
                              ? ` · Ref: ${subscription.referencia_provedor}`
                              : ""}
                          </p>
                        </div>

                        {canCancel ? (
                          <button
                            className={dangerCompact}
                            disabled={cancellingId !== null || isSubmitting}
                            onClick={() => handleCancelSubscription(subscription.id_assinatura)}
                            type="button"
                          >
                            {cancellingId === subscription.id_assinatura
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={`mt-3 p-4 text-sm text-black/60 ${cardInset}`}>
                  You have not started any subscriptions yet.
                </p>
              )}
            </div>

            {/* Payment History */}
            <div className="border-t border-black/10 pt-6">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#556B45]">
                Payment History
              </h3>

              {payments.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {payments.map((payment) => {
                    const statusBadge = formatPaymentStatus(payment.status);
                    const linkedSubscription = subscriptions.find(
                      (sub) => sub.id_assinatura === payment.id_assinatura,
                    );
                    const isLatestOverride =
                      linkedSubscription &&
                      activeSubscription?.id_assinatura === linkedSubscription.id_assinatura &&
                      subscribedPlanOverride;
                    const linkedPlan = isLatestOverride
                      ? subscribedPlanOverride
                      : linkedSubscription
                        ? plansById.get(linkedSubscription.id_plano)
                        : null;

                    return (
                      <li
                        className={`flex flex-wrap items-center justify-between gap-3 p-4 ${cardInset}`}
                        key={payment.id_pagamento}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-black">
                              {formatPlanPrice(payment.valor, payment.moeda)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${statusBadge.badgeClassName}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-black/60">
                            {linkedPlan
                              ? linkedPlan.nome
                              : `Subscription #${payment.id_assinatura}`}{" "}
                            · {formatSubscriptionDate(payment.data_hora)}
                          </p>
                        </div>

                        <span className="font-mono text-[11px] text-[#1E2E4F]">
                          {payment.referencia_provedor ?? `PAY-${payment.id_pagamento}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={`mt-3 p-4 text-sm text-black/60 ${cardInset}`}>
                  No payment records have been issued for your account yet.
                </p>
              )}
            </div>
          </div>
        </section>
        ) : null}
      </div>
    </div>
  );
}
