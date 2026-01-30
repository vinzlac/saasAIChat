"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PictureUploadProps {
  currentUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function PictureUpload({
  currentUrl,
  onUpload,
  onDelete,
  disabled,
  className,
}: PictureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Fichier trop volumineux. Maximum 5 MB.");
      return;
    }

    setLoading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!currentUrl) return;
    setLoading(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <Avatar className="h-24 w-24">
          {currentUrl ? (
            <AvatarImage src={currentUrl} alt="Photo de profil" />
          ) : null}
          <AvatarFallback className="text-2xl">
            {currentUrl ? "" : "?"}
          </AvatarFallback>
        </Avatar>
        {!disabled && (
          <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90">
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </label>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {currentUrl && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          Supprimer la photo
        </Button>
      )}
    </div>
  );
}
