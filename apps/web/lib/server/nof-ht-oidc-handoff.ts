function nofHtOrigin(): string {
  return process.env.NOF_HT_ORIGIN ?? process.env.NEXT_PUBLIC_NOF_HT_ORIGIN ?? "https://habit-tracker.forgath.ru";
}

export function nofHtOidcAuthorizeHref(callbackUrl = "/"): string {
  const url = new URL("/api/auth/platform/authorize", nofHtOrigin());
  url.searchParams.set("callbackUrl", callbackUrl);
  return url.toString();
}
