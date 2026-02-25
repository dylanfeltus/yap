"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cn,
  LANES,
  PRODUCTS,
  PLATFORMS,
  STATUSES,
  LANE_COLORS,
  STATUS_COLORS,
  parseJSON,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Lightbulb, X, Trash2, Edit } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Idea {
  id: string;
  title: string;
  notes: string;
  lanes: string; // JSON string array
  products: string; // JSON string array
  platform: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface IdeaFormData {
  title: string;
  notes: string;
  lanes: string[];
  products: string[];
  platform: string;
  status: string;
}

const EMPTY_FORM: IdeaFormData = {
  title: "",
  notes: "",
  lanes: [],
  products: [],
  platform: "Both",
  status: "idea",
};

// ---------------------------------------------------------------------------
// Helper: toggle a value in an array
// ---------------------------------------------------------------------------

function toggleArrayValue(arr: string[], value: string): string[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function IdeasPage() {
  // Data
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterLane, setFilterLane] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [form, setForm] = useState<IdeaFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Idea | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch ideas
  // -----------------------------------------------------------------------

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterLane !== "all") params.set("lane", filterLane);
      if (filterProduct !== "all") params.set("product", filterProduct);
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/ideas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIdeas(data);
      }
    } catch (err) {
      console.error("Failed to fetch ideas:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterLane, filterProduct, filterPlatform, filterStatus]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSearch(debouncedSearch), 300);
    return () => clearTimeout(id);
  }, [debouncedSearch]);

  // -----------------------------------------------------------------------
  // Create / Update
  // -----------------------------------------------------------------------

  function openNewDialog() {
    setEditingIdea(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(idea: Idea) {
    setEditingIdea(idea);
    setForm({
      title: idea.title,
      notes: idea.notes,
      lanes: parseJSON<string[]>(idea.lanes, []),
      products: parseJSON<string[]>(idea.products, []),
      platform: idea.platform,
      status: idea.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);

    try {
      const body = {
        title: form.title.trim(),
        notes: form.notes.trim(),
        lanes: form.lanes,
        products: form.products,
        platform: form.platform,
        status: form.status,
      };

      if (editingIdea) {
        await fetch(`/api/ideas/${editingIdea.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      setDialogOpen(false);
      setEditingIdea(null);
      setForm(EMPTY_FORM);
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to save idea:", err);
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await fetch(`/api/ideas/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to delete idea:", err);
    } finally {
      setDeleting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = ideas.length;
    const byStatus: Record<string, number> = {};
    for (const idea of ideas) {
      byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
    }
    return { total, byStatus };
  }, [ideas]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Lightbulb className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Idea Bank
            </h1>
            <p className="text-sm text-zinc-500">
              {stats.total} idea{stats.total !== 1 ? "s" : ""}
              {stats.byStatus.idea
                ? ` \u00b7 ${stats.byStatus.idea} new`
                : ""}
              {stats.byStatus.drafted
                ? ` \u00b7 ${stats.byStatus.drafted} drafted`
                : ""}
            </p>
          </div>
        </div>
        <Button
          onClick={openNewDialog}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4" />
          New Idea
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search ideas..."
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800"
          />
        </div>

        <Select value={filterLane} onValueChange={setFilterLane}>
          <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Lane" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lanes</SelectItem>
            {LANES.map((lane) => (
              <SelectItem key={lane} value={lane}>
                {lane}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {PRODUCTS.map((product) => (
              <SelectItem key={product} value={product}>
                {product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterLane !== "all" ||
          filterProduct !== "all" ||
          filterPlatform !== "all" ||
          filterStatus !== "all" ||
          debouncedSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterLane("all");
              setFilterProduct("all");
              setFilterPlatform("all");
              setFilterStatus("all");
              setDebouncedSearch("");
              setSearch("");
            }}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 mb-4">
            <Lightbulb className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-1">
            No ideas yet
          </h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-sm">
            Start capturing content ideas. Click &quot;New Idea&quot; to add
            your first one.
          </p>
          <Button
            onClick={openNewDialog}
            variant="outline"
            className="border-zinc-700"
          >
            <Plus className="h-4 w-4" />
            Add an idea
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const lanes = parseJSON<string[]>(idea.lanes, []);
            const products = parseJSON<string[]>(idea.products, []);

            return (
              <Card
                key={idea.id}
                className="group cursor-pointer border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/80 transition-colors"
                onClick={() => openEditDialog(idea)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">
                      {idea.title}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(idea);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(idea);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {idea.notes && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {idea.notes}
                    </p>
                  )}

                  {/* Lane tags */}
                  {lanes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lanes.map((lane) => (
                        <Badge
                          key={lane}
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-medium border",
                            LANE_COLORS[lane] || "bg-zinc-800 text-zinc-400"
                          )}
                        >
                          {lane}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Product tags */}
                  {products.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {products.map((product) => (
                        <Badge
                          key={product}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-400 border-sky-500/20"
                        >
                          {product}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Footer: platform + status */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                      {idea.platform}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5 py-0 font-medium border-0",
                        STATUS_COLORS[idea.status] ||
                          "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {idea.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingIdea(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-w-xl border-zinc-800 bg-zinc-950 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              {editingIdea ? "Edit Idea" : "New Idea"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="idea-title">Title</Label>
              <Input
                id="idea-title"
                placeholder="What's the idea?"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="idea-notes">Notes</Label>
              <Textarea
                id="idea-notes"
                placeholder="Add context, links, rough draft..."
                rows={4}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="bg-zinc-900 border-zinc-800 resize-none"
              />
            </div>

            {/* Lanes (toggle buttons) */}
            <div className="space-y-2">
              <Label>Lanes</Label>
              <div className="flex flex-wrap gap-2">
                {LANES.map((lane) => {
                  const active = form.lanes.includes(lane);
                  return (
                    <button
                      key={lane}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          lanes: toggleArrayValue(f.lanes, lane),
                        }))
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? cn(
                              LANE_COLORS[lane] ||
                                "bg-zinc-700 text-zinc-100 border-zinc-600",
                              "ring-1 ring-white/10"
                            )
                          : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      )}
                    >
                      {lane}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products (toggle buttons) */}
            <div className="space-y-2">
              <Label>Products</Label>
              <div className="flex flex-wrap gap-2">
                {PRODUCTS.map((product) => {
                  const active = form.products.includes(product);
                  return (
                    <button
                      key={product}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          products: toggleArrayValue(f.products, product),
                        }))
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-sky-500/20 text-sky-400 border-sky-500/30 ring-1 ring-white/10"
                          : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      )}
                    >
                      {product}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, platform: v }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editingIdea && (
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
                onClick={() => {
                  setDialogOpen(false);
                  setDeleteTarget(editingIdea);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingIdea(null);
                setForm(EMPTY_FORM);
              }}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title.trim() || saving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving
                ? "Saving..."
                : editingIdea
                  ? "Update Idea"
                  : "Create Idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Delete Idea</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-200">
              &quot;{deleteTarget?.title}&quot;
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
