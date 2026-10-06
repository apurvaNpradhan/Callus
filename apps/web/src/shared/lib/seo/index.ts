import { resolvePublicAssetUrl } from "@callus/core/assets";

import { appConfig } from "@/config/app.config";

export type TanStackStartSeoMetaTag =
  | { title: string }
  | { charSet: string }
  | { content: string; httpEquiv: string }
  | { content: string; name: string }
  | { content: string; property: string };

export type TanStackStartSeoLinkTag = {
  as?: string;
  crossOrigin?: "" | "anonymous" | "use-credentials";
  href: string;
  hrefLang?: string;
  rel: string;
  type?: string;
};

export type TanStackStartSeoScriptTag = {
  children: string;
  type: "application/ld+json";
};

export type TanStackStartSeoHead = {
  links?: TanStackStartSeoLinkTag[];
  meta?: TanStackStartSeoMetaTag[];
  scripts?: TanStackStartSeoScriptTag[];
};

export type TanStackStartSeoImage = {
  alt?: string;
  height?: number;
  type?:
    | "image/apng"
    | "image/avif"
    | "image/gif"
    | "image/jpeg"
    | "image/png"
    | "image/svg+xml"
    | "image/webp";
  url: string;
  width?: number;
};

export type TanStackStartSeoRobots = {
  follow?: boolean;
  index?: boolean;
  maxImagePreview?: "large" | "none" | "standard";
  noarchive?: boolean;
  noimageindex?: boolean;
  nosnippet?: boolean;
};

export type TanStackStartSeoSite = {
  applicationName?: string;
  baseUrl: string;
  defaultDescription?: string;
  defaultImages?: TanStackStartSeoImage[];
  defaultTitle: string;
  defaultTwitterCard?: "app" | "player" | "summary" | "summary_large_image";
  siteName?: string;
  titleTemplate?: string;
  twitterCreator?: string;
  twitterSite?: string;
};

export type GenerateTanStackStartSeoParams = {
  canonicalPath?: `/${string}`;
  description?: string;
  images?: TanStackStartSeoImage[];
  includeDocumentMeta?: boolean;
  locale?: string;
  openGraphType?: "article" | "profile" | "website";
  robots?: TanStackStartSeoRobots;
  scripts?: TanStackStartSeoScriptTag[];
  site: TanStackStartSeoSite;
  title?: string;
};

export type AppSeoOptions = Omit<GenerateTanStackStartSeoParams, "site">;

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function resolveRelativePathToAbsoluteUrl(
  path: string | URL,
  { baseUrl }: { baseUrl: string | URL }
): string {
  return new URL(path, baseUrl).toString();
}

function formatTitle({
  site: currentSite,
  title
}: {
  site: TanStackStartSeoSite;
  title: string;
}): string {
  if (!currentSite.titleTemplate) {
    return title;
  }

  return currentSite.titleTemplate.includes("%s")
    ? currentSite.titleTemplate.replace("%s", title)
    : `${title} ${currentSite.titleTemplate}`;
}

function formatRobotsContent({
  follow = true,
  index = true,
  maxImagePreview,
  noarchive = false,
  noimageindex = false,
  nosnippet = false
}: TanStackStartSeoRobots): string {
  return [
    index ? "index" : "noindex",
    follow ? "follow" : "nofollow",
    noarchive ? "noarchive" : undefined,
    noimageindex ? "noimageindex" : undefined,
    nosnippet ? "nosnippet" : undefined,
    maxImagePreview ? `max-image-preview:${maxImagePreview}` : undefined
  ]
    .filter(isDefined)
    .join(", ");
}

function buildOpenGraphImageMeta({
  baseUrl,
  images
}: {
  baseUrl: string;
  images?: TanStackStartSeoImage[];
}): TanStackStartSeoMetaTag[] {
  if (!images?.length) {
    return [];
  }

  return images.flatMap((image) => {
    const absoluteUrl = resolveRelativePathToAbsoluteUrl(image.url, { baseUrl });

    return [
      {
        content: absoluteUrl,
        property: "og:image"
      },
      image.alt
        ? {
            content: image.alt,
            property: "og:image:alt"
          }
        : undefined,
      image.width
        ? {
            content: `${image.width}`,
            property: "og:image:width"
          }
        : undefined,
      image.height
        ? {
            content: `${image.height}`,
            property: "og:image:height"
          }
        : undefined,
      image.type
        ? {
            content: image.type,
            property: "og:image:type"
          }
        : undefined
    ].filter(isDefined);
  });
}

function normalizeCanonicalPath(path: `/${string}`): `/${string}` {
  if (path === "/") {
    return path;
  }

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export function generateTanStackStartSeo({
  canonicalPath,
  description,
  images,
  includeDocumentMeta = false,
  locale,
  openGraphType = "website",
  robots,
  scripts,
  site: currentSite,
  title
}: GenerateTanStackStartSeoParams): TanStackStartSeoHead {
  const resolvedDescription = description ?? currentSite.defaultDescription;
  const resolvedImages = images?.length ? images : currentSite.defaultImages;
  const resolvedTitle = title ?? currentSite.defaultTitle;

  const formattedTitle = formatTitle({
    site: currentSite,
    title: resolvedTitle
  });

  const links: TanStackStartSeoLinkTag[] | undefined = canonicalPath
    ? [
        {
          href: resolveRelativePathToAbsoluteUrl(normalizeCanonicalPath(canonicalPath), {
            baseUrl: currentSite.baseUrl
          }),
          rel: "canonical"
        }
      ]
    : undefined;

  const canonicalUrl = links?.find((link) => link.rel === "canonical")?.href;
  const robotsContent = robots ? formatRobotsContent(robots) : undefined;
  const primaryImage = resolvedImages?.[0];

  const meta: TanStackStartSeoMetaTag[] = [
    includeDocumentMeta
      ? {
          charSet: "utf-8"
        }
      : undefined,
    includeDocumentMeta
      ? {
          content: "width=device-width, initial-scale=1",
          name: "viewport"
        }
      : undefined,
    includeDocumentMeta && currentSite.applicationName
      ? {
          content: currentSite.applicationName,
          name: "application-name"
        }
      : undefined,
    includeDocumentMeta
      ? {
          content: "on",
          httpEquiv: "x-dns-prefetch-control"
        }
      : undefined,
    {
      title: formattedTitle
    },
    resolvedDescription
      ? {
          content: resolvedDescription,
          name: "description"
        }
      : undefined,
    {
      content: formattedTitle,
      property: "og:title"
    },
    resolvedDescription
      ? {
          content: resolvedDescription,
          property: "og:description"
        }
      : undefined,
    currentSite.siteName
      ? {
          content: currentSite.siteName,
          property: "og:site_name"
        }
      : undefined,
    locale
      ? {
          content: locale,
          property: "og:locale"
        }
      : undefined,
    canonicalUrl
      ? {
          content: canonicalUrl,
          property: "og:url"
        }
      : undefined,
    {
      content: openGraphType,
      property: "og:type"
    },
    ...buildOpenGraphImageMeta({
      baseUrl: currentSite.baseUrl,
      images: resolvedImages
    }),
    {
      content: currentSite.defaultTwitterCard ?? "summary_large_image",
      name: "twitter:card"
    },
    {
      content: formattedTitle,
      name: "twitter:title"
    },
    resolvedDescription
      ? {
          content: resolvedDescription,
          name: "twitter:description"
        }
      : undefined,
    primaryImage
      ? {
          content: resolveRelativePathToAbsoluteUrl(primaryImage.url, {
            baseUrl: currentSite.baseUrl
          }),
          name: "twitter:image"
        }
      : undefined,
    primaryImage?.alt
      ? {
          content: primaryImage.alt,
          name: "twitter:image:alt"
        }
      : undefined,
    currentSite.twitterSite
      ? {
          content: currentSite.twitterSite,
          name: "twitter:site"
        }
      : undefined,
    currentSite.twitterCreator
      ? {
          content: currentSite.twitterCreator,
          name: "twitter:creator"
        }
      : undefined,
    robotsContent
      ? {
          content: robotsContent,
          name: "robots"
        }
      : undefined,
    robotsContent
      ? {
          content: robotsContent,
          name: "googlebot"
        }
      : undefined
  ].filter(isDefined);

  return {
    links,
    meta,
    scripts: scripts?.filter(isDefined)
  };
}

const site = {
  applicationName: appConfig.site.longName,
  baseUrl: appConfig.site.baseUrl,
  defaultDescription: appConfig.site.description,
  defaultImages: [
    {
      alt: appConfig.site.longName,
      height: 630,
      type: "image/png",
      url: resolvePublicAssetUrl(appConfig.site.url, "/og/index.png"),
      width: 1200
    }
  ],
  defaultTitle: appConfig.site.longName,
  siteName: appConfig.site.longName,
  titleTemplate: `%s | ${appConfig.site.shortName}`
} satisfies TanStackStartSeoSite;

function addSiteBasePath(path: `/${string}`): `/${string}` {
  const basePath = appConfig.site.basePath.replace(/\/+$/, "");

  // SAFETY: both configured basePath and validated SEO paths are root-relative.
  return `${basePath}${path}` as `/${string}`;
}

export function generateAppSeo({ canonicalPath, ...options }: AppSeoOptions) {
  return generateTanStackStartSeo({
    ...options,
    canonicalPath: canonicalPath ? addSiteBasePath(canonicalPath) : undefined,
    site
  });
}
