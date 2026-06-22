export function normalizePlatformEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailShape(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizePlatformEmail(email));
}

export function isTelegramPlaceholderEmail(email: string): boolean {
  const normalized = normalizePlatformEmail(email);
  return /^\d+@telegram\.(?:example\.com|forgath\.ru)$/.test(normalized);
}

export function isServiceEmail(email: string): boolean {
  return isTelegramPlaceholderEmail(email);
}

export function isResettableEmail(email: string): boolean {
  return isValidEmailShape(email) && !isServiceEmail(email);
}
