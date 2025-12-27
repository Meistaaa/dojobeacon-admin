import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2 } from "lucide-react";

interface DashboardStats {
  averageScore: number;
  totalAttempts: number;
  highestScore: number;
  totalTests: number;
  recentAttempts: {
    _id: string;
    testTitle: string;
    score: number;
    submittedAt: string;
  }[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<DashboardStats>("/dashboard/stats");
      setStats(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = [
    { label: "Average Score", value: `${stats?.averageScore ?? 0}%` },
    { label: "Tests Taken", value: stats?.totalAttempts ?? 0 },
    { label: "Best Score", value: `${stats?.highestScore ?? 0}%` },
    { label: "Available Tests", value: stats?.totalTests ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="At-a-glance metrics across the platform."
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-serif">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Attempts</CardTitle>
              <CardDescription>Latest submissions across all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.recentAttempts?.length ? (
                stats.recentAttempts.map((attempt) => (
                  <div
                    key={attempt._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{attempt.testTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">{attempt.score}%</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
