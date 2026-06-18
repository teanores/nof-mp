import { PasswordResetPage } from "@/components/PasswordResetPage";
import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const initialEmail = token ? "" : params.email?.trim() ?? "";
  const tokenStatus = token ? ((await getPlatformPasswordResetRepository().verifyResetToken({ token })).ok ? "valid" : "invalid") : undefined;

  return <PasswordResetPage initialEmail={initialEmail} token={token} tokenStatus={tokenStatus} />;
}
