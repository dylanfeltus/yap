"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DAYS, TIME_BLOCKS, PLATFORMS } from "@/lib/slot-utils";

interface SlotConfigData {
  id?: string;
  dayOfWeek: number;
  timeBlock: string;
  platform: string;
  targetCount: number;
  startHour: number;
  endHour: number;
}

interface ConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ConfigModal({ open, onOpenChange, onSaved }: ConfigModalProps) {
  const [configs, setConfigs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const key = (day: number, block: string, platform: string) =>
    `${day}-${block}-${platform}`;

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/slots");
      if (!res.ok) return;
      const data: SlotConfigData[] = await res.json();
      const map: Record<string, number> = {};
      data.forEach((s) => {
        map[key(s.dayOfWeek, s.timeBlock, s.platform)] = s.targetCount;
      });
      setConfigs(map);
    } catch {
      // Failed to load
    }
  }, []);

  useEffect(() => {
    if (open) loadConfigs();
  }, [open, loadConfigs]);

  function setCount(day: number, block: string, platform: string, count: number) {
    setConfigs((prev) => ({ ...prev, [key(day, block, platform)]: count }));
  }

  function applyToWeekdays() {
    setConfigs((prev) => {
      const next = { ...prev };
      for (const block of TIME_BLOCKS) {
        for (const platform of PLATFORMS) {
          const monVal = prev[key(0, block.id, platform)] || 0;
          for (let d = 1; d <= 4; d++) {
            next[key(d, block.id, platform)] = monVal;
          }
        }
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const items: SlotConfigData[] = [];
      for (let d = 0; d < 7; d++) {
        for (const block of TIME_BLOCKS) {
          for (const platform of PLATFORMS) {
            const count = configs[key(d, block.id, platform)] || 0;
            if (count > 0) {
              items.push({
                dayOfWeek: d,
                timeBlock: block.id,
                platform,
                targetCount: count,
                startHour: block.startHour,
                endHour: block.endHour,
              });
            }
          }
        }
      }

      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });

      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } catch {
      // Failed to save
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Configure Weekly Slots</DialogTitle>
        </DialogHeader>

        <div className="mb-3">
          <Button variant="outline" size="sm" onClick={applyToWeekdays} className="text-xs">
            Apply Monday → Tue–Fri
          </Button>
        </div>

        <div className="space-y-4">
          {TIME_BLOCKS.map((block) => (
            <div key={block.id}>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">
                {block.label} ({block.display})
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, dayIdx) => (
                  <div key={dayIdx} className="rounded-md border border-zinc-800 p-2">
                    <p className="mb-1.5 text-[10px] font-medium text-zinc-500">{day}</p>
                    {PLATFORMS.map((platform) => (
                      <div key={platform} className="flex items-center justify-between mb-1 last:mb-0">
                        <span className="text-[10px] text-zinc-400">
                          {platform === "LinkedIn" ? "in" : platform === "Article" ? "A" : "𝕏"}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={configs[key(dayIdx, block.id, platform)] || 0}
                          onChange={(e) =>
                            setCount(dayIdx, block.id, platform, parseInt(e.target.value) || 0)
                          }
                          className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-center text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
