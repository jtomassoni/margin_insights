'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, UtensilsCrossed } from 'lucide-react';

function navItemsFor(slug: string) {
  return [
    { href: `/dashboard/${slug}`, label: 'Overview', icon: LayoutDashboard },
    { href: `/dashboard/${slug}/reporting`, label: 'Reporting', icon: BarChart3 },
    { href: `/dashboard/${slug}/ingredients`, label: 'Menu', icon: UtensilsCrossed },
  ] as const;
}

const DashboardBottomNav = ({
  slug,
  open = false,
  onClose,
}: {
  slug: string;
  open?: boolean;
  onClose?: () => void;
}) => {
  const pathname = usePathname();
  const items = navItemsFor(slug);

  return (
    <nav
      className={`dashboard-bottom-nav ${open ? 'dashboard-bottom-nav--open' : ''}`}
      aria-label="Dashboard sections"
      role="navigation"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === `/dashboard/${slug}`
            ? pathname === `/dashboard/${slug}`
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`dashboard-bottom-nav-item ${isActive ? 'dashboard-bottom-nav-item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={onClose}
          >
            <Icon className="dashboard-bottom-nav-icon" aria-hidden />
            <span className="dashboard-bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default DashboardBottomNav;
