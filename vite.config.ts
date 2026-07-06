// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // المرحلة 4 — Prerender كل المسارات لبناء SPA static جاهز للتعبئة داخل APK عبر Capacitor.
    // Service Worker المُخصّص في public/sw.js يوفّر التشغيل Offline بعد أول فتح.
    prerender: {
      enabled: true,
      crawlLinks: true,
      routes: [
        "/",
        "/read",
        "/write",
        "/erase",
        "/lock",
        "/history",
        "/settings",
        "/test",
      ],
    },
  },
});
