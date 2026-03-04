'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Percent,
  DollarSign,
  Grid2X2,
  TrendingUp,
  Database,
  Lightbulb,
  UtensilsCrossed,
  Package,
  Tags,
} from 'lucide-react';

const MOBILE_BREAKPOINT = 1024;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

const NAV_ITEMS = [
  { type: 'overview' as const, href: 'overview', label: 'Overview', icon: LayoutDashboard },
  { type: 'report' as const, tab: 'leaks', label: 'Profit leak report', icon: AlertTriangle },
  { type: 'report' as const, tab: 'margins', label: 'Margins', icon: Percent },
  { type: 'report' as const, tab: 'pricing', label: 'Price suggestions', icon: DollarSign },
  { type: 'report' as const, tab: 'quadrant', label: 'Quadrant', icon: Grid2X2 },
  { type: 'report' as const, tab: 'snapshots', label: 'Cost drift', icon: TrendingUp },
  { type: 'report' as const, tab: 'manage', label: 'Manage snapshots', icon: Database },
  { type: 'report' as const, tab: 'insights', label: 'Insights', icon: Lightbulb },
  { type: 'menu' as const, tab: 'menu' as const, label: 'Menu items', icon: UtensilsCrossed },
  { type: 'menu' as const, tab: 'ingredients' as const, label: 'Manage ingredients', icon: Package },
  { type: 'menu' as const, tab: 'categories' as const, label: 'Categories', icon: Tags },
] as const;

interface DashboardSidebarProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({
  slug,
  isOpen,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const base = `/dashboard/${slug}`;
  const currentReportTab = searchParams.get('tab') ?? 'leaks';

  const sidebarContent = (
    <div className="dashboard-sidebar-portal landing">
      <div
        className="dashboard-sidebar-backdrop"
        aria-hidden
        onClick={onClose}
        data-open={isOpen}
      />
      <aside
        className="dashboard-sidebar"
        data-open={isOpen}
        aria-label="Dashboard navigation"
      >
        <nav className="dashboard-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const fullHref =
              item.type === 'overview'
                ? base
                : item.type === 'report'
                  ? `${base}/reporting?tab=${item.tab}`
                  : `${base}/ingredients?tab=${item.tab}`;
            const currentTab = searchParams.get('tab') ?? 'menu';
            const isActive =
              item.type === 'overview'
                ? pathname === base
                : item.type === 'report'
                  ? pathname.startsWith(`${base}/reporting`) && currentReportTab === item.tab
                  : pathname.startsWith(`${base}/ingredients`) && currentTab === item.tab;
            const Icon = item.icon;
            const key =
              item.type === 'overview' ? 'overview' : item.type === 'report' ? item.tab : `menu-${item.tab}`;
            return (
              <Link
                key={key}
                href={fullHref}
                className={`dashboard-sidebar-link ${isActive ? 'dashboard-sidebar-link--active' : ''}`}
                onClick={onClose}
              >
                <Icon className="dashboard-sidebar-icon" aria-hidden size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );

  // On mobile, portal to body so sidebar isn't clipped by parent overflow/stacking
  if (isMobile && typeof document !== 'undefined') {
    return createPortal(sidebarContent, document.body);
  }
  return sidebarContent;
}
