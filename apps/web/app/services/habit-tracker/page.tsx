import Link from "next/link";

export default function HabitTrackerServicePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel grid w-full max-w-3xl gap-6 p-6 sm:p-8">
        <div>
          <p className="tech-label text-xs text-forge-accent">Portal module</p>
          <h1 className="heading-tech mt-3 text-4xl font-bold text-forge-ink sm:text-5xl">Habit Tracker</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-forge-muted">
            Трекер привычек, целей и регулярных практик. Сервис открыт в тестовом режиме.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="tech-label rounded-sm border border-forge-accent bg-forge-accent px-5 py-3 text-xs text-black transition hover:border-forge-ink hover:bg-forge-ink" href="https://habit-tracker.forgath.ru">
            Перейти в Habit Tracker
          </Link>
          <Link className="tech-label rounded-sm border border-forge-line bg-forge-surface px-5 py-3 text-xs text-forge-muted transition hover:border-forge-accent hover:text-forge-accent" href="/overview">
            К разделам кузницы
          </Link>
        </div>
      </section>
    </main>
  );
}