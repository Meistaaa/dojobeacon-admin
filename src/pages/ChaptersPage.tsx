import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { paginate, buildPagination } from "../lib/pagination";
import type { PaginationState } from "../lib/pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

interface Subject {
  _id: string;
  name: string;
}

interface Chapter {
  _id: string;
  name: string;
  subject: string | Subject;
  description?: string;
}

type ChapterForm = {
  name: string;
  description: string;
  subject: string;
};

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 10 });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ChapterForm>({ name: "", description: "", subject: "" });
  const [editing, setEditing] = useState<(ChapterForm & { _id: string }) | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [chapterData, subjectData] = await Promise.all([
        apiFetch<Chapter[]>("/chapters"),
        apiFetch<Subject[]>("/subjects"),
      ]);
      setChapters(chapterData || []);
      setSubjects(subjectData || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load chapters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((s) => map.set(s._id, s.name));
    return map;
  }, [subjects]);

  const filtered = useMemo(() => {
    return chapters.filter((c) => {
      const subjectId = typeof c.subject === "string" ? c.subject : c.subject?._id;
      const matchesSubject = subjectFilter === "all" || subjectId === subjectFilter;
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  }, [chapters, subjectFilter, search]);

  const paged = paginate(filtered, pagination);
  const paginationInfo = buildPagination(filtered.length, pagination);

  const resetForm = () => setForm({ name: "", description: "", subject: "" });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.subject) {
      setError("Chapter name and subject are required");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await apiFetch("/chapters", {
        method: "POST",
        data: form,
        headers: { "Content-Type": "application/json" },
      });
      await load();
      resetForm();
      setShowAdd(false);
    } catch {
      setError("Failed to create chapter");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.subject) {
      setError("Chapter name and subject are required");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const { _id, ...payload } = editing;
      await apiFetch(`/chapters/${_id}`, {
        method: "PUT",
        data: payload,
        headers: { "Content-Type": "application/json" },
      });
      await load();
      setEditing(null);
    } catch {
      setError("Failed to update chapter");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this chapter?")) return;
    try {
      await apiFetch(`/chapters/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Failed to delete chapter");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chapters"
        description="Browse chapters by subject."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Add Chapter</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter by subject and search by name.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Search chapter name" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
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
            <CardTitle className="text-lg">Chapters</CardTitle>
            <CardDescription>{filtered.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2">Chapter</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((chapter) => {
                    const subjectId = typeof chapter.subject === "string" ? chapter.subject : chapter.subject?._id;
                    return (
                      <tr key={chapter._id} className="border-t border-border/70">
                        <td className="px-3 py-2 font-medium">{chapter.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {subjectId ? subjectMap.get(subjectId) || "—" : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{chapter.description || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label="Edit chapter"
                              onClick={() =>
                                setEditing({
                                  _id: chapter._id,
                                  name: chapter.name,
                                  description: chapter.description || "",
                                  subject: subjectId || "",
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                              aria-label="Delete chapter"
                              onClick={() => handleDelete(chapter._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* ADD CHAPTER MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Chapter</h3>
            <Input
              placeholder="Chapter name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <select
              className="h-10 rounded border px-3"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CHAPTER MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">Edit Chapter</h3>
            <Input
              placeholder="Chapter name"
              value={editing.name}
              onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))}
            />
            <select
              className="h-10 rounded border px-3"
              value={editing.subject}
              onChange={(e) => setEditing((p) => (p ? { ...p, subject: e.target.value } : p))}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
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
