"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Lightbulb,
  MessageSquare,
  Settings,
  CheckCircle2,
  Twitter,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Planner", href: "/planner", icon: CalendarDays, showBadge: true },
  { label: "Drafts", href: "/drafts", icon: FileText },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Reply Guy", href: "/replies", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface XAccountStatus {
  connected: boolean;
  username?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [xAccount, setXAccount] = useState<XAccountStatus>({
    connected: false,
  });
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    checkXAccountStatus();
    fetchPendingCount();
    // Refresh pending count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPendingCount() {
    try {
      const res = await fetch("/api/drafts?status=draft");
      if (!res.ok) return;
      const data = await res.json();
      setPendingCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // Silently fail — badge just won't show
    }
  }

  async function checkXAccountStatus() {
    try {
      const res = await fetch("/api/auth/x/status");
      const data = await res.json();
      setXAccount(data);
    } catch {
      // Failed to check status
    }
  }

  async function handleConnectX() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/x/authorize");
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  async function handleDisconnectX() {
    if (!confirm("Are you sure you want to disconnect your X account?")) {
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/auth/x/disconnect", { method: "POST" });
      setXAccount({ connected: false });
    } catch {
      // Failed to disconnect
    } finally {
      setLoading(false);
    }
  }

  function handleNavClick() {
    setMobileOpen(false);
  }

  const navLinks = (
    <nav className="flex-1 space-y-0.5 px-3 py-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive
                  ? "text-indigo-400"
                  : "text-zinc-500 group-hover:text-zinc-400"
              )}
            />
            <span className="flex-1">{item.label}</span>
            {item.showBadge && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500/20 px-1.5 text-[10px] font-semibold text-yellow-400">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white">
            Y
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Yap
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 transition hover:bg-zinc-800/70"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2.5 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white">
            Y
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Yap
          </span>
        </div>
        {navLinks}
        <div className="border-t border-zinc-800 px-3 py-3">
          {xAccount.connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-2.5 py-2">
                <Twitter className="h-4 w-4 text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-400">
                    @{xAccount.username}
                  </p>
                  <p className="text-[10px] text-zinc-500">Connected</p>
                </div>
                <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
              </div>
              <button
                onClick={handleDisconnectX}
                disabled={loading}
                className="w-full rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectX}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500/10 px-2.5 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
            >
              <Twitter className="h-4 w-4" />
              {loading ? "Connecting..." : "Connect X Account"}
            </button>
          )}
          <p className="mt-2 text-xs text-zinc-600">Yap v0.1</p>
        </div>
      </aside>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        <div className="flex h-14 items-center gap-2.5 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white">
            Y
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Yap
          </span>
        </div>
        {navLinks}
        <div className="border-t border-zinc-800 px-3 py-3">
          {xAccount.connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-2.5 py-2">
                <Twitter className="h-4 w-4 text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-400">
                    @{xAccount.username}
                  </p>
                  <p className="text-[10px] text-zinc-500">Connected</p>
                </div>
                <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
              </div>
              <button
                onClick={handleDisconnectX}
                disabled={loading}
                className="w-full rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectX}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-500/10 px-2.5 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
            >
              <Twitter className="h-4 w-4" />
              {loading ? "Connecting..." : "Connect X Account"}
            </button>
          )}
          <p className="mt-2 text-xs text-zinc-600">Yap v0.1</p>
        </div>
      </aside>
    </>
  );
}
