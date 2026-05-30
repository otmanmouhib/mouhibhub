'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard/atlanticdunes', label: 'Collections' },
];

export default function AtlanticDunesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Atlantic Dunes Admin</h1>
            <p className="mt-2 text-sm text-slate-600">Create, edit, and delete Atlantic Dunes content directly from MongoDB.</p>
          </div>
          <span className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">DB-backed CRUD</span>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
        <nav className="flex flex-wrap gap-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                  active ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
