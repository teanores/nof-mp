import { RegisterPage } from "@/components/RegisterPage";
import { getPlatformSettingsRepository } from "@/lib/server/platform-settings-repository";

interface RegisterRouteProps {
  searchParams: Promise<{
    email?: string;
    error?: "conflict" | "email_delivery" | "invalid" | "invalid_email" | "password_policy" | "unavailable";
    step?: "request" | "confirm";
  }>;
}

export default async function RegisterRoute({ searchParams }: RegisterRouteProps) {
  const params = await searchParams;
  const settings = await getPlatformSettingsRepository().getSettings();
  return <RegisterPage email={params.email} error={params.error} registrationPaused={settings.registrationPaused} step={params.step} />;
}
