'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', matchStartsWith: true },
  { href: '/settings', label: 'Settings', matchStartsWith: true },
];

function isItemActive(pathname, href, matchStartsWith = false) {
  if (matchStartsWith && pathname.startsWith(`${href}/`)) {
    return true;
  }

  return pathname === href;
}

export default function AppNavbar() {
  const pathname = usePathname();
  const isNotificationsActive = pathname === '/notifications' || pathname.startsWith('/notifications/');

  return (
    <header className="px-4 pt-4 sm:px-6 sm:pt-6">
      <nav className="averate-navbar mx-auto max-w-7xl rounded-full px-4 py-2 sm:px-6 sm:py-2.5" aria-label="Primary">
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <Link href="/dashboard" className="text-left averate-focus-ring rounded-xl px-1 py-1">
            <p className="averate-logo text-slate-900">
              AVE<span className="averate-logo-accent">RATE</span>
            </p>
          </Link>

          <div className="flex flex-wrap items-center gap-2 md:justify-self-center">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`averate-nav-link averate-focus-ring ${isItemActive(pathname, item.href, item.matchStartsWith) ? 'averate-nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="md:justify-self-end">
            <Link
              href="/notifications"
              className={`averate-cta-link averate-focus-ring inline-flex items-center rounded-full px-7 text-base font-semibold ${isNotificationsActive ? 'averate-cta-link-active' : ''}`}
            >
              Notifications
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
