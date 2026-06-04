import React from "react";
import { redirect } from "next/navigation";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";
import {
  findOAuthClient,
  isAllowedOAuthRedirectUri,
  normalizeOAuthScopes,
} from "@/lib/server/oauth-client-registry";
import { getOAuthConsentChallengeRepository } from "@/lib/server/oauth-consent-challenge-repository";
import { portalLoginUrl, portalPageSession } from "@/lib/server/portal-auth-gate";

interface OAuthConsentPageProps {
  searchParams: Promise<{
    client_id?: string;
    nonce?: string;
    redirect_uri?: string;
    response_type?: string;
    scope?: string;
    state?: string;
  }>;
}

function HiddenConsentFields({
  challengeId,
  decision,
}: {
  challengeId: string;
  decision: "approve" | "deny";
}) {
  return (
    <>
      <input name="challenge_id" type="hidden" value={challengeId} />
      <input name="decision" type="hidden" value={decision} />
    </>
  );
}

export default async function OAuthConsentPage({ searchParams }: OAuthConsentPageProps) {
  const params = await searchParams;
  const clientId = params.client_id ?? "";
  const redirectUri = params.redirect_uri ?? "";
  const responseType = params.response_type ?? "";
  const scope = params.scope ?? "";
  const state = params.state ?? "";
  const nonce = params.nonce ?? "";
  const client = findOAuthClient(clientId);

  const session = await portalPageSession();
  if (!session.authenticated || !session.user?.id) {
    redirect(portalLoginUrl("/oauth/consent"));
  }

  if (!client || responseType !== "code" || !isAllowedOAuthRedirectUri(client.clientId, redirectUri) || !state || !nonce) {
    redirect("/overview");
  }

  const scopes = normalizeOAuthScopes(client.clientId, scope);
  const challenge = await getOAuthConsentChallengeRepository().issue({
    clientId: client.clientId,
    nonce,
    platformUserId: session.user.id,
    redirectUri,
    scopes,
    state,
    ttlSeconds: 120,
  });

  return (
    <PortalPageShell maxWidthClassName="max-w-4xl">
      <PortalHeader
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: client.displayName }]}
        description={`NOF Platform передаст ${client.displayName} только подтверждённые данные текущей учётной записи.`}
        eyebrow="Platform identity"
        title={`Подключение ${client.displayName}`}
      />
      <section className="panel grid gap-6 p-6 sm:p-8">
        <div className="grid gap-2">
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Текущая учётная запись</h2>
          <p className="text-sm text-forge-muted">
            {session.user.username}
            {session.user.email ? <span> · {session.user.email}</span> : null}
          </p>
        </div>

        <div className="grid gap-3">
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Доступ</h2>
          <ul className="flex flex-wrap gap-2">
            {scopes.map((item) => (
              <li
                className="tech-label rounded-sm border border-forge-line bg-forge-surface px-3 py-2 text-xs text-forge-muted"
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <form action="/oauth/consent/approve" data-testid="oauth-approve-form" method="post">
            <HiddenConsentFields challengeId={challenge.challengeId} decision="approve" />
            <button
              className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs text-black transition hover:border-forge-ink hover:bg-forge-ink"
              type="submit"
            >
              Продолжить
            </button>
          </form>
          <form action="/oauth/consent/approve" data-testid="oauth-deny-form" method="post">
            <HiddenConsentFields challengeId={challenge.challengeId} decision="deny" />
            <button
              className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent"
              type="submit"
            >
              Отмена
            </button>
          </form>
        </div>
      </section>
    </PortalPageShell>
  );
}
