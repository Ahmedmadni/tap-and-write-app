/**
 * دوال الخادم الخاصة بمدفوعات Google Play.
 * - verifyPlayPurchase: يتحقق من purchaseToken لدى Google ثم يفعّل/يحدّث اشتراك المستخدم.
 * - syncPlaySubscription: إعادة فحص الاشتراك الحالي للمستخدم (استعادة المشتريات).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planFromBasePlan, PLAN_AMOUNT_USD } from "./products";

const purchaseSchema = z.object({
  productId: z.string().min(1),
  purchaseToken: z.string().min(10),
  basePlanId: z.string().nullable().optional(),
  orderId: z.string().nullable().optional(),
});

export const verifyPlayPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(purchaseSchema)
  .handler(async ({ data, context }) => {
    const { getSubscriptionState, acknowledgeSubscription } = await import("./google-play.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const state = await getSubscriptionState(data.purchaseToken);
    const plan = planFromBasePlan(data.basePlanId ?? state.basePlanId);

    if (state.active && !state.acknowledged) {
      await acknowledgeSubscription(data.productId, data.purchaseToken);
    }

    const userId = context.userId as string;
    const row = {
      user_id: userId,
      plan,
      status: state.active ? "active" : "expired",
      current_period_end: state.expiryTime,
      provider: "google_play",
      provider_subscription_id: data.purchaseToken,
      amount_usd: PLAN_AMOUNT_USD[plan],
      note: `Google Play: ${state.state}${data.orderId ? ` (${data.orderId})` : ""}`,
      updated_at: new Date().toISOString(),
    };

    const existing = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing.data?.id) {
      await supabaseAdmin.from("subscriptions").update(row).eq("id", existing.data.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert(row);
    }

    return { active: state.active, plan, expiresAt: state.expiryTime, state: state.state };
  });

export const syncPlaySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSubscriptionState } = await import("./google-play.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const userId = context.userId as string;
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, provider, provider_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub?.provider_subscription_id || sub.provider !== "google_play") {
      return { active: false, synced: false };
    }

    const state = await getSubscriptionState(sub.provider_subscription_id);
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: state.active ? "active" : "expired",
        current_period_end: state.expiryTime,
        note: `Google Play: ${state.state}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    return { active: state.active, synced: true };
  });
