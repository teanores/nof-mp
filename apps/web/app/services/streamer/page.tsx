import Link from "next/link";

export default function StreamerServicePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel grid w-full max-w-3xl gap-6 p-6 sm:p-8">
        <div>
          <p className="tech-label text-xs text-forge-accent">Portal module</p>
          <h1 className="heading-tech mt-3 text-4xl font-bold text-forge-ink sm:text-5xl">Портал стримера</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-forge-muted">
            Раздел будет доступен позже. Сейчас мы готовим страницу стримера и публичные материалы Te&apos;An&apos;ore.
          </p>
        </div>
        <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
          К разделам кузницы
        </Link>
      </section>
    </main>
  );
}