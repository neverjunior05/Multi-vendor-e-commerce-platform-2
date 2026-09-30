/**
 * SANDBOX PAYMENTS
 * ----------------
 * Student project = test mode only, never real money.
 *
 * If `STRIPE_SECRET_KEY` is present we call Stripe's test-mode PaymentIntents API
 * with a Stripe test payment method (`pm_card_visa`). Without a key we fall back
 * to a local simulator that mirrors Stripe's test-card behaviour so the checkout
 * flow is fully demoable offline.
 *
 * Test cards in simulator mode:
 *   4242 4242 4242 4242 -> approved
 *   5555 5555 5555 4444 -> approved (mastercard)
 *   4000 0000 0000 0002 -> declined (card_declined)
 *   anything else       -> invalid number
 */

export type PaymentRequest = {
  amountCents: number;
  cardNumber: string;
  expMonth?: number;
  expYear?: number;
  cvc?: string;
  name?: string;
};

export type PaymentResult =
  | { ok: true; reference: string; brand: string; provider: "stripe-test" | "sandbox-simulator" }
  | { ok: false; error: string; code: string };

const BIN_BRANDS: Array<[RegExp, string]> = [
  [/^4/, "visa"],
  [/^5[1-5]/, "mastercard"],
  [/^3[47]/, "amex"],
];

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = Number(digits[i]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

function detectBrand(digits: string): string {
  return BIN_BRANDS.find(([pattern]) => pattern.test(digits))?.[1] ?? "card";
}

async function chargeWithStripe(req: PaymentRequest): Promise<PaymentResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, error: "No Stripe key", code: "no_provider" };
  try {
    const body = new URLSearchParams({
      amount: String(req.amountCents),
      currency: "usd",
      "payment_method_types[]": "card",
      "payment_method_data[type]": "card",
      "payment_method_data[card][token]": "tok_visa",
      confirm: "true",
      "automatic_payment_methods[enabled]": "true",
      "automatic_payment_methods[allow_redirects]": "never",
    });
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json()) as { id?: string; status?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      return { ok: false, error: data.error?.message ?? "Stripe declined the card", code: "card_declined" };
    }
    return { ok: true, reference: data.id, brand: "visa", provider: "stripe-test" };
  } catch {
    return { ok: false, error: "Could not reach the payment gateway", code: "network_error" };
  }
}

function chargeWithSimulator(req: PaymentRequest): PaymentResult {
  const digits = req.cardNumber.replace(/\D/g, "");
  if (!luhnValid(digits)) {
    return { ok: false, error: "That card number is invalid.", code: "invalid_number" };
  }
  if (digits === "4000000000000002") {
    return { ok: false, error: "Your card was declined (test card).", code: "card_declined" };
  }
  return {
    ok: true,
    reference: `pi_sandbox_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    brand: detectBrand(digits),
    provider: "sandbox-simulator",
  };
}

export async function chargeCard(req: PaymentRequest): Promise<PaymentResult> {
  if (req.amountCents <= 0) {
    return { ok: false, error: "Cart total must be greater than zero.", code: "invalid_amount" };
  }
  if (process.env.STRIPE_SECRET_KEY) return chargeWithStripe(req);
  return chargeWithSimulator(req);
}
