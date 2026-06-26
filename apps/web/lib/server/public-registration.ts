import { NextResponse } from "next/server";

export function normalizeRegistrationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function redirectToRegistrationRequestError(error = "unavailable"): NextResponse {
  const url = new URL("/register", "http://localhost");
  url.searchParams.set("error", error);
  return new NextResponse(null, { headers: { Location: `${url.pathname}${url.search}` }, status: 303 });
}

export function redirectToRegistrationConfirm(email: string): NextResponse {
  const url = new URL("/register", "http://localhost");
  url.searchParams.set("step", "confirm");
  url.searchParams.set("email", normalizeRegistrationEmail(email));
  return new NextResponse(null, { headers: { Location: `${url.pathname}${url.search}` }, status: 303 });
}

export function redirectToRegistrationConfirmError(email: string, error = "invalid"): NextResponse {
  const url = new URL("/register", "http://localhost");
  url.searchParams.set("step", "confirm");
  url.searchParams.set("email", normalizeRegistrationEmail(email));
  url.searchParams.set("error", error);
  return new NextResponse(null, { headers: { Location: `${url.pathname}${url.search}` }, status: 303 });
}

export function redirectToLoginAfterRegistration(): NextResponse {
  return new NextResponse(null, { headers: { Location: "/login?registered=1" }, status: 303 });
}
