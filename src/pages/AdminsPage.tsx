import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import api from "../lib/axiosInstance";
import { paginate, buildPagination } from "../lib/pagination";
import type { PaginationState } from "../lib/pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { MultiSelect } from "../components/ui/multi-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuthStore } from "../stores/authStore";

interface AdminProfile {
  _id: string;
  name?: string;
  createdAt?: string;
  user?: {
    _id?: string;
    email?: string;
    role?: string;
    permissions?: string[];
  };
}

type AdminFormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  permissions: string;
};

const initialForm: AdminFormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  permissions: "",
};

export default function AdminsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canManageAdmins = user?.role === "super_admin";
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [permissionsOptions, setPermissionsOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });
  const [form, setForm] = useState<AdminFormState>(initialForm);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsDirty, setPermissionsDirty] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!isAdmin) {
        setAdmins([]);
        setError("Only admins can view admin profiles.");
        return;
      }

      const data = await apiFetch<AdminProfile[]>("/profiles");
      const list = Array.isArray(data) ? data : [];
      setAdmins(
        list.filter(
          (profile) => (profile.user?.role || "").toLowerCase() === "admin"
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load admin profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, [isAdmin]);

  const loadPermissions = async () => {
    try {
      const res = await api.get<{ success?: boolean; permissions?: string[] }>(
        "/auth/permissions"
      );
      const list = Array.isArray(res.data?.permissions)
        ? res.data.permissions
        : [];
      setPermissionsOptions(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load permissions.");
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const filtered = useMemo(() => {
    return admins.filter((profile) => {
      const name = (profile.name || "").toLowerCase();
      const email = (profile.user?.email || "").toLowerCase();
      const matchesSearch =
        name.includes(search.toLowerCase()) ||
        email.includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [admins, search]);

  const paged = paginate(filtered, pagination);
  const paginationInfo = buildPagination(filtered.length, pagination);

  const handleSubmit = async () => {
    if (!canManageAdmins) return;
    const email = form.email.trim();
    const password = form.password.trim();
    if (!editingAdmin && (!email || !password)) {
      setError("Email and password are required to create an admin.");
      return;
    }

    const permissions = selectedPermissions.length
      ? selectedPermissions
      : form.permissions
          .split(",")
          .map((perm) => perm.trim())
          .filter(Boolean);

    try {
      setSaving(true);
      setError(null);
      if (editingAdmin?.user?._id) {
        const payload: {
          email?: string;
          password?: string;
          firstName?: string;
          lastName?: string;
          permissions?: string[];
        } = {};
        if (email) payload.email = email;
        if (password) payload.password = password;
        if (form.firstName.trim()) payload.firstName = form.firstName.trim();
        if (form.lastName.trim()) payload.lastName = form.lastName.trim();
        if (permissionsDirty) {
          payload.permissions = permissions;
        }
        await api.put(`/auth/admin/${editingAdmin.user._id}`, payload);
      } else {
        await api.post("/auth/admin", {
          email,
          password,
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          permissions,
        });
      }
      setForm(initialForm);
      setSelectedPermissions([]);
      setPermissionsDirty(false);
      setEditingAdmin(null);
      setShowModal(false);
      await loadAdmins();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save admin details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile: AdminProfile) => {
    if (!profile.user?._id || !canManageAdmins) return;
    if (!window.confirm("Delete this admin?")) return;
    try {
      setError(null);
      await api.delete(`/auth/admin/${profile.user._id}`);
      await loadAdmins();
    } catch (err) {
      console.error(err);
      setError("Failed to delete admin.");
    }
  };

  const openCreate = () => {
    setEditingAdmin(null);
    setForm(initialForm);
    setSelectedPermissions([]);
    setPermissionsDirty(false);
    setShowModal(true);
  };

  const openEdit = (profile: AdminProfile) => {
    setEditingAdmin(profile);
    const email = profile.user?.email || "";
    const nameParts = (profile.name || "").split(" ").filter(Boolean);
    setForm({
      email,
      password: "",
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      permissions: "",
    });
    setSelectedPermissions(profile.user?.permissions || []);
    setPermissionsDirty(false);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        description="Manage admin accounts and permissions."
        action={
          <Button size="sm" onClick={openCreate} disabled={!canManageAdmins}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Create admin</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search admin profiles.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            <CardTitle className="text-lg">Admins</CardTitle>
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
                    <th className="px-3 py-2">Permissions</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((profile) => (
                    <tr key={profile._id} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium">
                        {profile.name || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {profile.user?.email || "—"}
                      </td>
                      <td className="px-3 py-2 capitalize">admin</td>
                      <td className="px-3 py-2">
                        {(profile.user?.permissions || []).length > 0
                          ? (profile.user?.permissions || []).join(", ")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {profile.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => openEdit(profile)}
                            disabled={!canManageAdmins}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => handleDelete(profile)}
                            disabled={!canManageAdmins}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-background p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingAdmin ? "Update admin" : "Create admin"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {editingAdmin
                    ? "Update admin details and permissions."
                    : "Invite a new admin and assign permissions."}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
              {!editingAdmin && (
                <Input
                  placeholder="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              )}
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
              <div className="md:col-span-2">
                {permissionsOptions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Permissions (hold Cmd/Ctrl to select multiple)
                    </p>
                    <MultiSelect
                      value={selectedPermissions}
                      onValueChange={(values) => {
                        setSelectedPermissions(values);
                        setPermissionsDirty(true);
                      }}
                      options={permissionsOptions.map((perm) => ({
                        label: perm,
                        value: perm,
                      }))}
                      placeholder="Select permissions"
                    />
                  </div>
                ) : (
                  <Input
                    placeholder="Permissions (comma separated)"
                    value={form.permissions}
                    onChange={(e) => {
                      setPermissionsDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        permissions: e.target.value,
                      }));
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Only admins can create new admins.</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canManageAdmins || saving}
                >
                  {saving ? "Saving..." : editingAdmin ? "Update admin" : "Create admin"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
