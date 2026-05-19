import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full bg-brand-500/10 px-5 py-3 text-sm text-brand-100 shadow-sm shadow-brand-500/20">
              <span className="font-semibold">MBHUB</span>
              <span className="text-slate-300">MOUHIBHUB Enterprise Dashboard</span>
            </div>
            <div className="max-w-3xl space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                A professional admin dashboard for managing contacts and users across your brands.
              </h1>
              <p className="text-lg leading-8 text-slate-400">
                Secure login, polished enterprise design, and data visibility from Atlantic Dunes and AdroBioFarm. Built for modern operations and mobile-first workflows.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-500 px-6 py-4 text-base font-semibold text-white transition hover:bg-brand-400 sm:w-auto"
              >
                Login to dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-brand-300">Enterprise features</p>
            <div className="mt-8 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
                <p className="text-sm text-slate-400">Data aggregation</p>
                <p className="mt-2 text-lg font-semibold text-white">Connect multiple sites into a single dashboard.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
                <p className="text-sm text-slate-400">Secure access</p>
                <p className="mt-2 text-lg font-semibold text-white">Admin-only login and centralized user control.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
                <p className="text-sm text-slate-400">Mobile friendly</p>
                <p className="mt-2 text-lg font-semibold text-white">Designed for desktop and modern mobile workflows.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
