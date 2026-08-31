/**
 * Google Play Real-time Developer Notifications (Pub/Sub push endpoint).
 * يستقبل تغييرات الاشتراك (تجديد/إلغاء/انتهاء) ويحدّث قاعدة البيانات.
 *
 * الحماية: يجب استدعاء الرابط مع ?token=<PLAY_RTDN_SECRET> كما يُضبط في اشتراك Pub/Sub.
 * الرابط: https://<project>.lovable.app/api/public/play-rtdn?token=...
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/play-rtdn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PLAY_RTDN_SECRET"];
        const url = new URL(request.url);
        if (!secret || url.searchParams.get("token") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let purchaseToken: string | null = null;
        try {
          const body = (await request.json()) as { message?: { data?: string } };
          const raw = body?.message?.data ? atob(body.message.data) : "{}";
          const payload = JSON.parse(raw) as {
            subscriptionNotification?: { purchaseToken?: string };
          };
          purchaseToken = payload.subscriptionNotification?.purchaseToken ?? null;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        if (!purchaseToken) return new Response("ok");

        try {
          const { getSubscriptionState } = await import("@/lib/billing/google-play.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const state = await getSubscriptionState(purchaseToken);
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: state.active ? "active" : "expired",
              current_period_end: state.expiryTime,
              note: `Google Play RTDN: ${state.state}`,
              updated_at: new Date().toISOString(),
            })
            .eq("provider", "google_play")
            .eq("provider_subscription_id", purchaseToken);
        } catch (e) {
          console.error("[play-rtdn]", e);
          return new Response("error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
