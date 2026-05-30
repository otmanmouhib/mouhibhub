'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/websites', label: 'Websites' },
  { href: '/dashboard/atlanticdunes', label: 'Atlantic Dunes' },
  { href: '/dashboard/contacts', label: 'Contacts' },
  { href: '/dashboard/users', label: 'Users' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-3xl px-4 py-3 text-sm font-semibold transition ${
              active
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
