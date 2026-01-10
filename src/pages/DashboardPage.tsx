import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch, buildQuery } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AdminDashboardResponse = {
  totals: {
    totalUsers: number;
    activeSubscribers: number;
    totalRevenue: number;
    currency: string;
  };
  growthOverTime: {
    period: string;
    data: { period: string; count: number }[];
  };
  subscribersByBoard: { board: string; count: number }[];
  subscribersByProvince: { province: string; count: number }[];
  genderBreakdown: { gender: string; count: number }[];
  subscriptionPlans: { plan: string; count: number }[];
  revenueByPlan: { plan: string; amount: number }[];
};

const formatCurrency = (amount: number, currency: string) => {
  if (!currency) return `${amount}`;
  return `${currency} ${amount.toLocaleString()}`;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminDashboardResponse | null>(null);
  const [period, setPeriod] = useState("monthly");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = buildQuery({ period });
      const data = await apiFetch<AdminDashboardResponse>(`/dashboard/admin${query}`);
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
  }, [period]);

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif">{stats?.totals.totalUsers ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active Subscribers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-3xl font-serif">{stats?.totals.activeSubscribers ?? 0}</p>
                <p className="text-xs text-muted-foreground">(Premium Plans)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif">
                  {formatCurrency(stats?.totals.totalRevenue ?? 0, stats?.totals.currency ?? "PKR")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Growth Over Time</CardTitle>
                <CardDescription>{period} user growth snapshot.</CardDescription>
              </div>
              <select
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.growthOverTime?.data?.length ? (
                <div className="h-64 rounded-xl border border-border bg-background px-3 py-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.growthOverTime.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available to display.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscribers by Board</CardTitle>
                <CardDescription>Top 10 boards by subscriber count.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.subscribersByBoard?.length ? (
                  <div className="h-64 rounded-xl border border-border bg-background p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.subscribersByBoard}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="board"
                          width={120}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available to display.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscribers by Province</CardTitle>
                <CardDescription>Top 10 provinces by subscriber count.</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.subscribersByProvince?.length ? (
                  <div className="h-64 rounded-xl border border-border bg-background p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.subscribersByProvince}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="province"
                          width={120}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available to display.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gender Breakdown</CardTitle>
                <CardDescription>Distribution of user genders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.genderBreakdown?.length ? (
                  stats.genderBreakdown.map((entry) => (
                    <div key={entry.gender} className="flex items-center justify-between text-sm">
                      <span>{entry.gender}</span>
                      <span className="font-medium">{entry.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No data available to display.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscription Plans</CardTitle>
                <CardDescription>Active subscribers per plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.subscriptionPlans?.length ? (
                  stats.subscriptionPlans.map((entry) => (
                    <div key={entry.plan} className="flex items-center justify-between text-sm">
                      <span>{entry.plan}</span>
                      <span className="font-medium">{entry.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No data available to display.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Plan</CardTitle>
                <CardDescription>Total revenue by subscription plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.revenueByPlan?.length ? (
                  stats.revenueByPlan.map((entry) => (
                    <div key={entry.plan} className="flex items-center justify-between text-sm">
                      <span>{entry.plan}</span>
                      <span className="font-medium">
                        {formatCurrency(entry.amount, stats?.totals.currency ?? "PKR")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No data available to display.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
