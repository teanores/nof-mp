import Link from "next/link";
import React from "react";

import { PortalHeader, PortalPageShell } from "@/components/PortalLayout";

const legalNotes = [
  {
    title: "Статус страницы",
    text: "Это тестовая страница и рабочий набросок для будущих юридических документов NOF. Она создана, чтобы посмотреть структуру, язык и место страницы в интерфейсе.",
  },
  {
    title: "Юридическая сила",
    text: "Текущий текст не является публичной офертой, договором, пользовательским соглашением, политикой конфиденциальности, юридической консультацией или окончательными условиями использования.",
  },
  {
    title: "Что будет позже",
    text: "Настоящие условия использования, правила обработки данных, политика конфиденциальности и другие обязательные документы будут подготовлены отдельно и опубликованы после согласования.",
  },
  {
    title: "Способы входа",
    text: "Базовый вход и регистрация в NOF строятся вокруг аккаунта платформы и подтверждённой электронной почты. Вход через Telegram, иностранные социальные сети или внешние почтовые провайдеры как отдельный способ авторизации не используется без отдельного legal-решения.",
  },
];

export default function LegalDraftPage() {
  return (
    <PortalPageShell maxWidthClassName="max-w-[1100px]">
      <PortalHeader
        actions={
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-4 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        }
        breadcrumbs={[{ href: "/overview", label: "Разделы кузницы" }, { label: "Юридические аспекты" }]}
        description="Черновая страница для будущих юридических документов платформы."
        title="Юридические аспекты"
      />

      <section className="panel grid gap-5 p-6 sm:p-8">
        <div className="rounded-sm border border-amber-400/50 bg-forge-surface p-4">
          <p className="tech-label text-xs text-amber-200">Черновик / пример</p>
          <h2 className="heading-tech mt-2 text-2xl font-bold text-forge-ink">Не является юридическим документом</h2>
          <p className="mt-3 text-sm leading-7 text-forge-muted">
            Эта страница нужна только для предварительного просмотра того, как юридический раздел может выглядеть на
            платформе. Она не создаёт прав и обязанностей, не описывает финальные правила сервиса и не заменяет
            документы, которые будут подготовлены позже.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {legalNotes.map((note) => (
            <article key={note.title} className="rounded-sm border border-forge-line bg-forge-surface p-4">
              <h2 className="heading-tech text-lg font-bold text-forge-ink">{note.title}</h2>
              <p className="mt-2 text-sm leading-6 text-forge-muted">{note.text}</p>
            </article>
          ))}
        </div>

        <section className="rounded-sm border border-forge-line bg-forge-surface p-4">
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Предварительная формулировка для будущего согласия</h2>
          <p className="mt-2 text-sm leading-7 text-forge-muted">
            В будущей версии рядом с регистрацией может появиться явное согласие пользователя с условиями использования
            платформы. До публикации финальных документов такое согласие не должно считаться юридически значимым
            подтверждением условий.
          </p>
        </section>

        <section className="rounded-sm border border-forge-line bg-forge-surface p-4">
          <h2 className="heading-tech text-lg font-bold text-forge-ink">Compliance hardening авторизации</h2>
          <p className="mt-2 text-sm leading-7 text-forge-muted">
            Для подготовки к пользовательскому тестированию платформа фиксирует консервативное правило: продукты NOF
            используют собственный аккаунт NOF и собственный NOF OAuth между сервисами. Telegram может использоваться
            как канал сообщества, уведомлений или привязки после входа, но не как самостоятельная регистрация или вход
            пользователя.
          </p>
        </section>
      </section>
    </PortalPageShell>
  );
}
