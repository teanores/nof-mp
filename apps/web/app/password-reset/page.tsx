import { PasswordResetPage } from "@/components/PasswordResetPage";
import { getPlatformPasswordResetRepository } from "@/lib/server/platform-password-reset-repository";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const tokenStatus = token ? ((await getPlatformPasswordResetRepository().verifyResetToken({ token })).ok ? "valid" : "invalid") : undefined;

  return <PasswordResetPage token={token} tokenStatus={tokenStatus} />;
}
