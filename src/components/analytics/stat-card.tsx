import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <Card className="border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </span>
          <Icon className="h-4 w-4 text-zinc-600" />
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-100">
          {value}
        </p>
        {trend && (
          <p className="mt-1 text-xs text-zinc-500">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
