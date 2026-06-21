import { RegisterPage } from "@/components/RegisterPage";

interface RegisterRouteProps {
  searchParams: Promise<{
    email?: string;
    error?: "conflict" | "email_delivery" | "invalid" | "invalid_email" | "password_policy" | "unavailable";
    step?: "request" | "confirm";
  }>;
}

export default async function RegisterRoute({ searchParams }: RegisterRouteProps) {
  const params = await searchParams;
  return <RegisterPage email={params.email} error={params.error} step={params.step} />;
}
