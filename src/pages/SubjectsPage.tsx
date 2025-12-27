import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch, buildQuery } from "../lib/api";
import { paginate, buildPagination } from "../lib/pagination";
import type { PaginationState } from "../lib/pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface Subject {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  createdAt?: string;
}

type SubjectForm = {
  name: string;
  description: string;
  type: string;
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 10 });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<(SubjectForm & { _id: string }) | null>(null);
  const [form, setForm] = useState<SubjectForm>({ name: "", description: "", type: "mdcat" });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = buildQuery({ type: typeFilter !== "all" ? typeFilter : undefined });
      const data = await apiFetch<Subject[]>(`/subjects${query}`);
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [typeFilter]);

  const filtered = useMemo(() => {
    return subjects.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [subjects, search]);

  const paged = paginate(filtered, pagination);
  const paginationInfo = buildPagination(filtered.length, pagination);

  const resetForm = () => setForm({ name: "", description: "", type: "mdcat" });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await apiFetch("/subjects", {
        method: "POST",
        data: form,
        headers: { "Content-Type": "application/json" },
      });
      await load();
      resetForm();
      setShowAdd(false);
    } catch {
      setError("Failed to create subject");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const { _id, ...payload } = editing;
      await apiFetch(`/subjects/${_id}`, {
        method: "PUT",
        data: payload,
        headers: { "Content-Type": "application/json" },
      });
      await load();
      setEditing(null);
    } catch {
      setError("Failed to update subject");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      await apiFetch(`/subjects/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Failed to delete subject");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage subjects across curricula."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Add Subject</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter subjects.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All curricula</option>
            <option value="mdcat">MDCAT</option>
            <option value="o_levels">O Level</option>
            <option value="a_levels">A Level</option>
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={pagination.pageSize}
            onChange={(e) =>
              setPagination((prev) => ({ ...prev, page: 1, pageSize: Number(e.target.value) || 10 }))
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
            <CardTitle className="text-lg">Subjects</CardTitle>
            <CardDescription>{filtered.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((subject) => (
                    <tr key={subject._id} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium">{subject.name}</td>
                      <td className="px-3 py-2 capitalize">{subject.type || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{subject.description || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label="Edit subject"
                            onClick={() =>
                              setEditing({
                                _id: subject._id,
                                name: subject.name,
                                description: subject.description || "",
                                type: subject.type || "mdcat",
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                            aria-label="Delete subject"
                            onClick={() => handleDelete(subject._id)}
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
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= paginationInfo.pageCount}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ADD SUBJECT MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Subject</h3>
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <select
              className="h-10 rounded border px-3"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="mdcat">MDCAT</option>
              <option value="o_levels">O Level</option>
              <option value="a_levels">A Level</option>
            </select>
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUBJECT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">Edit Subject</h3>
            <Input
              placeholder="Name"
              value={editing.name}
              onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))}
            />
            <select
              className="h-10 rounded border px-3"
              value={editing.type}
              onChange={(e) => setEditing((p) => (p ? { ...p, type: e.target.value } : p))}
            >
              <option value="mdcat">MDCAT</option>
              <option value="o_levels">O Level</option>
              <option value="a_levels">A Level</option>
            </select>
            <Input
              placeholder="Description (optional)"
              value={editing.description}
              onChange={(e) => setEditing((p) => (p ? { ...p, description: e.target.value } : p))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
