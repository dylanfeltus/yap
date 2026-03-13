import Link from "next/link";
import { Mic, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your Yap configuration</p>
      </div>
      <div className="space-y-2">
        <Link
          href="/voice"
          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Voice Profiles</p>
              <p className="text-xs text-zinc-500">Configure AI writing voices for each platform</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
      </div>
    </div>
  );
}
