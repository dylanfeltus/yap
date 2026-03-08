"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapEntry {
  day: number;
  dayName: string;
  hour: number;
  avgEngagement: number;
}

interface TimeHeatmapProps {
  data: HeatmapEntry[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getIntensity(value: number, max: number): string {
  if (max === 0) return "bg-zinc-800";
  const ratio = value / max;
  if (ratio === 0) return "bg-zinc-800";
  if (ratio < 0.25) return "bg-green-900/40";
  if (ratio < 0.5) return "bg-green-800/60";
  if (ratio < 0.75) return "bg-green-600/70";
  return "bg-green-500";
}

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

export function TimeHeatmap({ data }: TimeHeatmapProps) {
  if (data.length === 0) {
    return (
      <Card className="border border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Best Time to Post
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-zinc-500">Not enough data to show patterns yet</p>
        </CardContent>
      </Card>
    );
  }

  const lookup = new Map<string, number>();
  let maxEngagement = 0;
  for (const entry of data) {
    const key = `${entry.day}-${entry.hour}`;
    lookup.set(key, entry.avgEngagement);
    if (entry.avgEngagement > maxEngagement) maxEngagement = entry.avgEngagement;
  }

  return (
    <Card className="border border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          Best Time to Post
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="mb-1 flex">
            <div className="w-10 shrink-0" />
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <div
                key={h}
                className="text-[10px] text-zinc-500"
                style={{ width: `${(100 / 24) * 3}%` }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="mb-0.5 flex items-center">
              <div className="w-10 shrink-0 text-xs text-zinc-500">{day}</div>
              <div className="flex flex-1 gap-0.5">
                {HOURS.map((h) => {
                  const val = lookup.get(`${di}-${h}`) ?? 0;
                  return (
                    <div
                      key={h}
                      className={`h-5 flex-1 rounded-sm ${getIntensity(val, maxEngagement)} transition-colors`}
                      title={`${day} ${formatHour(h)}: ${val} avg engagement`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
