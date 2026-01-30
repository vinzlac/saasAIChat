import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthConnection } from "@/components/settings/oauth-connection";

export default function SettingsPage() {
  return (
    <main className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres</CardTitle>
          <CardDescription>
            Gérez vos connexions et préférences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Intégrations</h3>
            <OAuthConnection />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
