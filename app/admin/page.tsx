import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl p-6">
        <Card className="rounded-2xl border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle>Admin(TBD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Admin user management will be configured here.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
