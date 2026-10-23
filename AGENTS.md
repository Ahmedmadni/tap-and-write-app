# Architecture rules

- Keep Android's static page list in `scripts/mobile-pages.ts`, shared by prerender configuration and packaging validation, so every local page is checked before and after Capacitor sync.
- Prerender only visitor-independent page shells; authentication, user data, payments and AI calls remain client-initiated so no private data is captured in bundled HTML.
- Pin seroval and seroval-plugins together to an explicitly tested compatible release; floating serializer upgrades can change preview and prerender behavior.