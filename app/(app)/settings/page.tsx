import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { UsagePanel } from "@/components/settings/UsagePanel";

export default function SettingsPage() {
  return (
    // ProtectedRoute is applied by the (app)/settings layout, so wrapping again
    // here would nest two auth gates around the same page.
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferences for this device and your account.
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg tracking-tight">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ThemeToggle />
          <p className="text-xs text-muted-foreground">
            Follows your system setting unless you pick one.
          </p>
        </CardContent>
      </Card>

      <UsagePanel />

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg tracking-tight">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Account and workspace settings are coming during beta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
