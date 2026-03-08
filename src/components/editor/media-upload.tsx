"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ImagePlus, X, GripVertical } from "lucide-react";

const MAX_IMAGES = 4;

interface MediaUploadProps {
  attachments: string[];
  onChange: (attachments: string[]) => void;
}

export function MediaUpload({ attachments, onChange }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_IMAGES - attachments.length;

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const toUpload = Array.from(files).slice(0, remaining);
      if (toUpload.length === 0) return;

      setUploading(true);
      const newUrls: string[] = [];

      try {
        for (const file of toUpload) {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/uploads", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data: { url: string } = await res.json();
            newUrls.push(data.url);
          }
        }

        if (newUrls.length > 0) {
          onChange([...attachments, ...newUrls]);
        }
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [attachments, onChange, remaining]
  );

  function handleRemove(index: number) {
    onChange(attachments.filter((_, i) => i !== index));
  }

  function handleDragStart(index: number) {
    setDragSourceIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragSourceIndex === null || dragSourceIndex === dropIndex) {
      setDragOverIndex(null);
      setDragSourceIndex(null);
      return;
    }

    const updated = [...attachments];
    const [moved] = updated.splice(dragSourceIndex, 1);
    updated.splice(dropIndex, 0, moved);
    onChange(updated);
    setDragOverIndex(null);
    setDragSourceIndex(null);
  }

  function handleDragEnd() {
    setDragOverIndex(null);
    setDragSourceIndex(null);
  }

  function handleDropZone(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  function handleDropZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {attachments.map((url, idx) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group aspect-square rounded-md overflow-hidden border border-zinc-800 bg-zinc-900",
                dragOverIndex === idx && "ring-2 ring-blue-500"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Attachment ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                aria-label={`Remove image ${idx + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute top-1 left-1 p-0.5 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      {remaining > 0 && (
        <div
          onDrop={handleDropZone}
          onDragOver={handleDropZoneDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 px-3 py-3 cursor-pointer transition-colors",
            "hover:border-zinc-500 hover:bg-zinc-900/50",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <ImagePlus className="h-4 w-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            {uploading
              ? "Uploading..."
              : `Add images (${attachments.length}/${MAX_IMAGES})`}
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );
}
