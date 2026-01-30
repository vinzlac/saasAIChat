"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HobbiesInput } from "./hobbies-input";
import { PictureUpload } from "./picture-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  description: string | null;
  profile_picture_url: string | null;
  hobbies: string[];
}

export function ProfileForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setProfile(data);
        setDescription(data.description ?? "");
        setHobbies(data.hobbies ?? []);
      })
      .catch(() => setError("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, hobbies }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la sauvegarde");
        return;
      }
      setProfile(data);
      router.refresh();
    } catch {
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handlePictureUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/user/profile/picture", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erreur upload");
    }
    const data = await res.json();
    setProfile((p) => (p ? { ...p, profile_picture_url: data.profile_picture_url } : null));
    router.refresh();
  }

  async function handlePictureDelete() {
    const res = await fetch("/api/user/profile/picture", { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur suppression");
    setProfile((p) => (p ? { ...p, profile_picture_url: null } : null));
    router.refresh();
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  if (error && !profile) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!profile) return null;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Gérez vos informations personnelles
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <PictureUpload
            currentUrl={profile.profile_picture_url}
            onUpload={handlePictureUpload}
            onDelete={handlePictureDelete}
          />
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              L&apos;email n&apos;est pas modifiable
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={profile.first_name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={profile.last_name} disabled className="bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 caractères
            </p>
          </div>
          <div className="space-y-2">
            <Label>Passe-temps</Label>
            <HobbiesInput value={hobbies} onChange={setHobbies} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
