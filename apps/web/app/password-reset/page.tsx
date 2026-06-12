import { PasswordResetPage } from "@/components/PasswordResetPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <PasswordResetPage token={params.token} />;
}
