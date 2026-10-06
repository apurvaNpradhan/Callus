# SEO patterns

Web SEO helpers live in `apps/web/src/shared/lib/seo/`; route metadata and app-specific site configuration belong to `apps/web`.

## Route metadata

- Define page metadata with TanStack Start route `head()` and `generateAppSeo(...)` from the web app's SEO module.
- Keep `canonicalPath` route-relative, such as `"/articles"` or `` `/profile/${params.id}` ``.
- Use route loader data for dynamic titles, descriptions, and images.
- Set `robots: { index: false, follow: false }` on dashboards, auth pages, editors, and internal search pages.
- Web URLs are unprefixed. Do not generate locale-prefixed canonical URLs or localized alternates.

## Root and site metadata

- Use `generateAppSeo(...)` in `routes/__root.tsx` and set `includeDocumentMeta: true` only at the root.
- Keep site configuration, favicons, sitemap, robots.txt, stylesheet, and preload links in `apps/web`.
- TanStack Start route heads are explicit. Do not rely on Next.js-style metadata inheritance.
- Prefer a site-level `titleTemplate` and default Open Graph image. Override route images only when a page-specific image adds useful information.

## Structured data

Build JSON-LD objects explicitly in the consuming app until a concrete shared use case justifies extracting them.
