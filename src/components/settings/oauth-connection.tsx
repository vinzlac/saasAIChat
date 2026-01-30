"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";

export function OAuthConnection() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/oauth/google/status")
      .then((res) => res.json())
      .then((data) => {
        setConnected(data.connected ?? false);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    const error = params.get("error");
    if (oauth === "success") {
      setMessage("Google Calendar connecté avec succès.");
      setConnected(true);
    } else if (error === "oauth" || error === "oauth_invalid" || error === "oauth_failed") {
      setMessage("Erreur lors de la connexion à Google Calendar.");
    }
  }, []);

  async function handleConnect() {
    setActionLoading(true);
    window.location.href = "/api/oauth/google/authorize";
  }

  async function handleDisconnect() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/oauth/google/disconnect", {
        method: "DELETE",
      });
      if (res.ok) {
        setConnected(false);
        setMessage("Google Calendar déconnecté.");
      }
    } catch {
      setMessage("Erreur lors de la déconnexion.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Google Calendar</p>
            <p className="text-sm text-muted-foreground">
              {connected
                ? "Connecté - Le chat peut accéder à vos événements"
                : "Non connecté - Connectez pour interroger votre calendrier"}
            </p>
          </div>
        </div>
        <Button
          variant={connected ? "outline" : "default"}
          onClick={connected ? handleDisconnect : handleConnect}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : connected ? (
            "Déconnecter"
          ) : (
            "Connecter"
          )}
        </Button>
      </div>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
