import { RegisterPage } from "@/components/RegisterPage";

interface RegisterRouteProps {
  searchParams: Promise<{ email?: string; error?: "unavailable" | "invalid" | "conflict"; step?: "request" | "confirm" }>;
}

export default async function RegisterRoute({ searchParams }: RegisterRouteProps) {
  const params = await searchParams;
  return <RegisterPage email={params.email} error={params.error} step={params.step} />;
}
