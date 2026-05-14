"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Sparkles, type LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const items: NavItem[] = [
  { href: "/", label: "Calendar", Icon: CalendarDays },
  { href: "/other", label: "Soon", Icon: Sparkles },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <ul className="bottom-nav-list">
        {items.map(({ href, label, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="bottom-nav-item">
              <Link
                href={href}
                className={`bottom-nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="bottom-nav-icon-wrap">
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                </span>
                <span className="bottom-nav-label">{label}</span>
                <span className="bottom-nav-indicator" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
