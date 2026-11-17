import { NextResponse } from "next/server";

import { getBackendUrl } from "@/app/lib/books";
import {
  type BillingConfig,
  type PaymentRecord,
  type Subscription,
  type SubscriptionPlan,
} from "@/app/lib/subscription-utils";
import {
  buildJsonResponseFromText,
  getSessionToken,
  isSameOriginRequest,
} from "@/app/api/_lib/subscription";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to view subscription details." },
      { status: 401 },
    );
  }

  const backendUrl = getBackendUrl();
  const authHeaders = { Authorization: `Bearer ${token}` };

  try {
    const [configResponse, plansResponse, subscriptionsResponse, paymentsResponse] =
      await Promise.all([
        fetch(`${backendUrl}/v2/billing/config`, { cache: "no-store" }),
        fetch(`${backendUrl}/v2/plans`, { cache: "no-store" }),
        fetch(`${backendUrl}/v2/me/subscriptions`, { headers: authHeaders, cache: "no-store" }),
        fetch(`${backendUrl}/v2/me/payments`, { headers: authHeaders, cache: "no-store" }),
      ]);

    for (const protectedResponse of [subscriptionsResponse, paymentsResponse]) {
      if (protectedResponse.status === 401 || protectedResponse.status === 403) {
        const errorText = await protectedResponse.text();
        return buildJsonResponseFromText(
          errorText,
          protectedResponse.status,
          "You are not authorized to access subscription records.",
        );
      }
    }

    const configData = configResponse.ok
      ? ((await configResponse.json().catch(() => null)) as { demo_billing?: unknown } | null)
      : null;
    const plansData = plansResponse.ok
      ? ((await plansResponse.json().catch(() => [])) as SubscriptionPlan[])
      : [];
    const subscriptionsData = subscriptionsResponse.ok
      ? ((await subscriptionsResponse.json().catch(() => [])) as Subscription[])
      : [];
    const paymentsData = paymentsResponse.ok
      ? ((await paymentsResponse.json().catch(() => [])) as PaymentRecord[])
      : [];

    const billingConfig: BillingConfig = {
      demo_billing: Boolean(configData?.demo_billing),
    };

    return NextResponse.json({
      billingConfig,
      plans: Array.isArray(plansData)
        ? plansData.filter((plan) => plan.ativo !== false).sort((a, b) => a.id_plano - b.id_plano)
        : [],
      subscriptions: Array.isArray(subscriptionsData)
        ? [...subscriptionsData].sort((a, b) => b.id_assinatura - a.id_assinatura)
        : [],
      payments: Array.isArray(paymentsData)
        ? [...paymentsData].sort((a, b) => b.id_pagamento - a.id_pagamento)
        : [],
    });
  } catch {
    return NextResponse.json(
      { detail: "The subscription service is unavailable." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { detail: "Please sign in to complete subscription checkout." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ detail: "Request body must be a JSON object." }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ detail: "Request body must be valid JSON." }, { status: 400 });
    }
  }

  const rawPlanId = body.id_plano;
  const hasCustomPlanId = rawPlanId !== undefined && rawPlanId !== null;
  if (
    hasCustomPlanId &&
    (typeof rawPlanId !== "number" || !Number.isSafeInteger(rawPlanId) || rawPlanId <= 0)
  ) {
    return NextResponse.json(
      { detail: "Please select a valid subscription plan." },
      { status: 422 },
    );
  }

  if (body.member_emails !== undefined && !Array.isArray(body.member_emails)) {
    return NextResponse.json({ detail: "Family member emails must be a list." }, { status: 422 });
  }
  const memberEmails = Array.isArray(body.member_emails)
    ? body.member_emails.map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    : [];
  if (memberEmails.some((email) => !email)) {
    return NextResponse.json(
      { detail: "Family member emails must be valid text values." },
      { status: 422 },
    );
  }

  const backendUrl = getBackendUrl();

  try {
    if (!hasCustomPlanId) {
      return NextResponse.json({ detail: "Please select a subscription plan." }, { status: 422 });
    }
    const backendResponse = await fetch(`${backendUrl}/v2/me/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id_plano: rawPlanId,
        holder_birth_date: body.holder_birth_date,
        holder_age_confirmed: body.holder_age_confirmed === true,
        member_emails: memberEmails,
      }),
      cache: "no-store",
    });
    const responseBody = await backendResponse.text();
    return buildJsonResponseFromText(
      responseBody,
      backendResponse.status,
      "The subscription service returned an invalid response.",
    );
  } catch {
    return NextResponse.json(
      { detail: "The subscription service is unavailable." },
      { status: 502 },
    );
  }
}
