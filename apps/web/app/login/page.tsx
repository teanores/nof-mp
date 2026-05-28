import { LoginPage } from "@/components/LoginPage";

interface LoginRouteProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  const params = await searchParams;
  return <LoginPage error={params.error} next={params.next} />;
}
