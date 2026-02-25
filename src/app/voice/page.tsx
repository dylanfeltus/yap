"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, parseJSON } from "@/lib/utils";
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
import { Separator } from "@/components/ui/separator";
import { Mic, Plus, Trash2, Edit, X } from "lucide-react";

interface VoiceProfile {
  id: string;
  platform: string;
  name: string;
  description: string;
  examples: string; // JSON string of string[]
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  platform: string;
  name: string;
  description: string;
  examples: string[];
}

const EMPTY_FORM: FormState = {
  platform: "X",
  name: "",
  description: "",
  examples: [""],
};

const PLATFORM_COLORS: Record<string, string> = {
  X: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  LinkedIn: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function VoiceProfilesPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form and target profile
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<VoiceProfile | null>(
    null
  );

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/voice");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(profile: VoiceProfile) {
    const examples = parseJSON<string[]>(profile.examples, []);
    setForm({
      platform: profile.platform,
      name: profile.name,
      description: profile.description,
      examples: examples.length > 0 ? examples : [""],
    });
    setEditingId(profile.id);
    setEditOpen(true);
  }

  function openDelete(profile: VoiceProfile) {
    setDeletingProfile(profile);
    setDeleteOpen(true);
  }

  function updateExample(index: number, value: string) {
    setForm((prev) => {
      const updated = [...prev.examples];
      updated[index] = value;
      return { ...prev, examples: updated };
    });
  }

  function addExample() {
    setForm((prev) => ({ ...prev, examples: [...prev.examples, ""] }));
  }

  function removeExample(index: number) {
    setForm((prev) => {
      const updated = prev.examples.filter((_, i) => i !== index);
      return { ...prev, examples: updated.length > 0 ? updated : [""] };
    });
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          name: form.name.trim(),
          description: form.description.trim(),
          examples: form.examples.filter((e) => e.trim() !== ""),
        }),
      });
      if (res.ok) {
        await fetchProfiles();
        setCreateOpen(false);
        resetForm();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/voice/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          name: form.name.trim(),
          description: form.description.trim(),
          examples: form.examples.filter((e) => e.trim() !== ""),
        }),
      });
      if (res.ok) {
        await fetchProfiles();
        setEditOpen(false);
        resetForm();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingProfile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/voice/${deletingProfile.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchProfiles();
        setDeleteOpen(false);
        setDeletingProfile(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function ProfileFormFields() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Platform</Label>
          <Select
            value={form.platform}
            onValueChange={(val) => setForm((prev) => ({ ...prev, platform: val }))}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="X">X</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Profile Name</Label>
          <Input
            id="name"
            placeholder="e.g. Main X Voice, LinkedIn Thought Leader"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Voice Description / Guidelines</Label>
          <Textarea
            id="description"
            placeholder="Describe the tone, style, and guidelines for this voice profile..."
            className="min-h-[120px] resize-y"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Example Posts</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExample}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Example
            </Button>
          </div>
          {form.examples.map((example, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                placeholder={`Example post ${index + 1}...`}
                className="min-h-[80px] resize-y flex-1"
                value={example}
                onChange={(e) => updateExample(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 shrink-0 text-zinc-500 hover:text-red-400"
                onClick={() => removeExample(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-zinc-500">Loading voice profiles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
            <Mic className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Voice Profiles
            </h1>
            <p className="text-sm text-zinc-500">
              Manage voice guidelines and example posts for AI content
              generation.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      <Separator />

      {/* Empty State */}
      {profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 py-20">
          <Mic className="mb-4 h-10 w-10 text-zinc-600" />
          <h3 className="text-lg font-medium text-zinc-300">
            No voice profiles yet
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Create a voice profile to guide AI-generated content for each
            platform.
          </p>
          <Button onClick={openCreate} variant="outline" className="mt-6">
            <Plus className="h-4 w-4" />
            Create Your First Profile
          </Button>
        </div>
      )}

      {/* Profile Grid */}
      {profiles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {profiles.map((profile) => {
            const examples = parseJSON<string[]>(profile.examples, []);
            return (
              <Card
                key={profile.id}
                className="group border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          PLATFORM_COLORS[profile.platform] ||
                            "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        )}
                      >
                        {profile.platform}
                      </Badge>
                      <CardTitle className="text-base">
                        {profile.name}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-200"
                        onClick={() => openEdit(profile)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-400"
                        onClick={() => openDelete(profile)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.description ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">
                      {profile.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-zinc-600">
                      No description provided.
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                    <span>
                      {examples.length}{" "}
                      {examples.length === 1 ? "example" : "examples"}
                    </span>
                    <span className="text-zinc-700">&#183;</span>
                    <span>
                      Updated{" "}
                      {new Date(profile.updatedAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Voice Profile</DialogTitle>
          </DialogHeader>
          <ProfileFormFields />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Creating..." : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Voice Profile</DialogTitle>
          </DialogHeader>
          <ProfileFormFields />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Voice Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-200">
              {deletingProfile?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
