'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function navItemsFor(slug: string) {
  return [
    { href: `/dashboard/${slug}`, label: 'Overview', labelShort: 'Overview' },
    { href: `/dashboard/${slug}/reporting`, label: 'Reporting', labelShort: 'Reports' },
    { href: `/dashboard/${slug}/ingredients`, label: 'Menu & Recipes', labelShort: 'Menu' },
    { href: `/dashboard/${slug}/sales`, label: 'Sales', labelShort: 'Sales' },
  ] as const;
}

const DashboardTopNav = ({ slug }: { slug: string }) => {
  const pathname = usePathname();
  const items = navItemsFor(slug);

  return (
    <nav
      className="dashboard-top-nav"
      aria-label="Dashboard sections"
    >
      <div className="dashboard-top-nav-inner">
        {items.map(({ href, label, labelShort }) => {
          const isActive =
            href === `/dashboard/${slug}`
              ? pathname === `/dashboard/${slug}`
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`dashboard-top-nav-item ${isActive ? 'dashboard-top-nav-item--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="dashboard-top-nav-label-full">{label}</span>
              <span className="dashboard-top-nav-label-short">{labelShort}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default DashboardTopNav;
