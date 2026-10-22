"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Settings,
  LogOut,
  Languages,
  Moon,
  Sun,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IconComponent } from "./stat-tile";

const itemClass =
  "relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-full text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50";
const activeClass =
  "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground";

// Dictionary lookups are `string | undefined` under noUncheckedIndexedAccess
interface NavItem {
  label: string | undefined;
  href: string;
  icon: IconComponent;
  active: boolean;
}

/** Icon-only rail item with a tooltip on the inline-end side */
function RailItem({
  label,
  icon: Icon,
  href,
  active,
  onClick,
}: {
  label: string | undefined;
  icon: IconComponent;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = cn(itemClass, active && activeClass);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          href ? (
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={className}
            />
          ) : (
            <button type="button" aria-label={label} onClick={onClick} className={className} />
          )
        }
      >
        <Icon className="size-5" />
      </TooltipTrigger>
      <TooltipContent side="inline-end" sideOffset={14}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "");
        setUserName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            ""
        );
      }
    }
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems: NavItem[] = [
    {
      label: t.nav.overview,
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: t.nav.orders,
      href: "/dashboard/orders",
      icon: ClipboardList,
      active: pathname.startsWith("/dashboard/orders"),
    },
    {
      label: t.nav.products,
      href: "/dashboard/products",
      icon: Package,
      active: pathname.startsWith("/dashboard/products"),
    },
    {
      label: t.nav.settings,
      href: "/dashboard/settings",
      icon: Settings,
      active: pathname.startsWith("/dashboard/settings"),
    },
  ];

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? t.common.lightMode : t.common.darkMode;

  // Account menu: the avatar on desktop; on mobile it also holds the rail's
  // bottom-group actions, since the tab bar has no room for them
  const accountMenu = (compact: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.shell.account}
        className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar className="size-10">
          <AvatarFallback className="bg-sage-soft text-xs font-bold text-sage">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? "top" : "inline-end"}
        align="end"
        sideOffset={compact ? 16 : 14}
        className="w-60 rounded-xl p-1.5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{userEmail}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")} className="gap-2 py-2">
          <Settings />
          {t.nav.settings}
        </DropdownMenuItem>
        {compact && (
          <>
            <DropdownMenuItem onClick={toggleTheme} closeOnClick={false} className="gap-2 py-2">
              <ThemeIcon />
              {themeLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleLanguage} closeOnClick={false} className="gap-2 py-2">
              <Languages />
              {t.shell.switchLanguage}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout} className="gap-2 py-2">
          <LogOut />
          {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop: floating icon rail */}
      <aside className="fixed inset-y-4 start-4 z-40 hidden w-20 flex-col items-center justify-between gap-6 overflow-y-auto rounded-[1.75rem] bg-sidebar py-5 shadow-card [scrollbar-width:none] md:flex">
        <nav aria-label={t.shell.mainNavigation} className="flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <RailItem key={item.href} {...item} />
          ))}
        </nav>

        <div className="flex flex-col items-center gap-2">
          <RailItem label={themeLabel} icon={ThemeIcon} onClick={toggleTheme} />
          <RailItem label={t.shell.switchLanguage} icon={Languages} onClick={toggleLanguage} />
          <RailItem label={t.nav.logout} icon={LogOut} onClick={handleLogout} />
          {accountMenu(false)}
        </div>
      </aside>

      {/* Mobile: bottom tab bar */}
      <nav
        aria-label={t.shell.mainNavigation}
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center justify-between rounded-full bg-sidebar p-1.5 shadow-float md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
              className={cn(itemClass, item.active && activeClass)}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
        {accountMenu(true)}
      </nav>
    </>
  );
}
