function nofTtOrigin(): string {
  return process.env.NOF_TT_ORIGIN ?? process.env.NEXT_PUBLIC_NOF_TT_ORIGIN ?? "https://task-tracker.forgath.ru";
}

export function nofTtOidcStartHref(next = "/projects"): string {
  const url = new URL("/auth/platform/start", nofTtOrigin());
  url.searchParams.set("next", next);
  return url.toString();
}
