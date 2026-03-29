'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/about', label: 'About' },
  { href: '/settings', label: 'Settings' },
];

function isItemActive(pathname, href) {
  return pathname === href;
}

export default function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="px-4 pt-4 sm:px-6 sm:pt-6">
      <nav className="averate-navbar mx-auto max-w-7xl rounded-3xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="text-left">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-700/80">Averate</p>
            <p className="text-lg font-semibold text-slate-900">Movie Intelligence</p>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`averate-nav-link ${isItemActive(pathname, item.href) ? 'averate-nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="md:ml-4">
            <Link href="/notifications" className="averate-btn averate-btn-primary rounded-full px-5 py-2 text-sm font-semibold inline-flex">
              Notifications
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
