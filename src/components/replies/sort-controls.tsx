"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortMode = "opportunity" | "newest" | "trending";

interface SortControlsProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
}

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortMode)}>
      <SelectTrigger className="w-[180px] h-8 text-xs border-zinc-700 bg-zinc-900">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="opportunity">Best opportunity</SelectItem>
        <SelectItem value="newest">Newest</SelectItem>
        <SelectItem value="trending">Trending</SelectItem>
      </SelectContent>
    </Select>
  );
}
