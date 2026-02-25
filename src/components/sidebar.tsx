"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Lightbulb,
  FileText,
  Calendar,
  Clock,
  MessageSquare,
  BarChart3,
  Mic,
  Twitter,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Idea Bank", href: "/ideas", icon: Lightbulb },
  { label: "Draft Workshop", href: "/drafts", icon: FileText },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Scheduler", href: "/scheduler", icon: Clock },
  { label: "Reply Guy", href: "/replies", icon: MessageSquare },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Voice Profiles", href: "/voice", icon: Mic },
];

interface XAccountStatus {
  connected: boolean;
  username?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [xAccount, setXAccount] = useState<XAccountStatus>({ connected: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkXAccountStatus();
  }, []);

  async function checkXAccountStatus() {
    try {
      const res = await fetch("/api/auth/x/status");
      const data = await res.json();
      setXAccount(data);
    } catch (error) {
      console.error("Failed to check X account status:", error);
    }
  }

  async function handleConnectX() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/x/authorize");
      const data = await res.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to start X OAuth flow:", error);
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
    } catch (error) {
      console.error("Failed to disconnect X account:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-800 bg-zinc-900">
      {/* App title */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-bold text-white">
          C
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Command Center
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
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
        <p className="mt-2 text-xs text-zinc-600">CCC v0.1</p>
      </div>
    </aside>
  );
}
