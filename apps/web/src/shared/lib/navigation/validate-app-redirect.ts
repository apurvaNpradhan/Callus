import { type AnyRoute } from "@tanstack/react-router";

type AppRoute = {
  children?: AppRoute[] | Record<string, AppRoute>;
  fullPath?: string;
  id?: string;
  options?: { children?: AppRoute[] | Record<string, AppRoute> };
};

type AppRoutePath = { id: string; path: string };

/** Checks whether a redirect targets a real web route and returns a safe local path. */
export function validateAppRedirectPath({
  fallbackTo = "/",
  routeTree,
  shouldIncludeRoute,
  to
}: {
  fallbackTo?: `/${string}`;
  routeTree: AnyRoute;
  shouldIncludeRoute: (route: AppRoutePath) => boolean;
  to: string | undefined;
}): `/${string}` {
  if (!to) {
    return fallbackTo;
  }

  let target: URL;

  try {
    target = new URL(to, "http://callus.local");
  } catch {
    return fallbackTo;
  }

  const path = normalizeRoutePath(target.pathname);

  const matchingRoute = getAppRoutePaths(routeTree).find(
    (route) => normalizeRoutePath(route.path) === path && shouldIncludeRoute(route)
  );

  if (!matchingRoute) {
    return fallbackTo;
  }

  // SAFETY: URL.pathname is root-relative and query/hash cannot change its leading slash.
  return `${target.pathname}${target.search}${target.hash}` as `/${string}`;
}

/** Identifies whether a URL belongs to one of the guest only web routes. */
export function isAppGuestRoute(pathname: string, routeTree: AnyRoute): boolean {
  const path = normalizeRoutePath(pathname);

  return getAppRoutePaths(routeTree).some(
    (route) => route.id.includes("(guest)") && normalizeRoutePath(route.path) === path
  );
}

function getAppRoutePaths(routeTree: AnyRoute): AppRoutePath[] {
  const routes: AppRoutePath[] = [];

  function visit(route: AppRoute): void {
    if (route.id && route.fullPath) {
      routes.push({ id: route.id, path: route.fullPath });
    }

    const children = route.children ?? route.options?.children;

    if (children) {
      for (const child of Array.isArray(children) ? children : Object.values(children)) {
        visit(child);
      }
    }
  }

  // SAFETY: TanStack routes expose the child and fullPath fields traversed by visit().
  visit(routeTree as AppRoute);

  return routes;
}

function normalizeRoutePath(path: string): string {
  if (path === "/") {
    return path;
  }

  return path.replace(/\/+$/, "");
}
