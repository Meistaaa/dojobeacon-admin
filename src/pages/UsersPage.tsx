import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { paginate, buildPagination } from "../lib/pagination";
import type { PaginationState } from "../lib/pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Loader2 } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  createdAt?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });

  const roleOptions = useMemo(() => {
    const seen = new Set<string>();
    users.forEach((user) => {
      const normalized = (user.role ?? "").trim().toLowerCase();
      if (!normalized || seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
    });
    return Array.from(seen);
  }, [users]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      // Placeholder: if no user listing API exists, this will throw.
      const data = await apiFetch<User[]>("/profiles");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        "User listing API not available. Update the endpoint in UsersPage.tsx to match your admin users route."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        roleFilter === "all" || (u.role || "").toLowerCase() === roleFilter;
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const paged = paginate(filtered, pagination);
  const paginationInfo = buildPagination(filtered.length, pagination);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts." />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter by role.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={pagination.pageSize}
            onChange={(e) =>
              setPagination((prev) => ({
                ...prev,
                page: 1,
                pageSize: Number(e.target.value) || 10,
              }))
            }
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Users</CardTitle>
            <CardDescription>{filtered.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((user) => (
                    <tr key={user._id} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium">
                        {user.name || "—"}
                      </td>
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2 capitalize">
                        {user.role || "user"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {pagination.page} of {paginationInfo.pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= paginationInfo.pageCount}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
