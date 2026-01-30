"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Chat", icon: MessageSquare },
  { href: "/app/profile", label: "Profil", icon: User },
  { href: "/app/settings", label: "Paramètres", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2" aria-label="Navigation principale">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
