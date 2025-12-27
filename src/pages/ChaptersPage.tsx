import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { paginate, buildPagination } from "../lib/pagination";
import type { PaginationState } from "../lib/pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, RefreshCcw } from "lucide-react";

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

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 10 });

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chapters"
        description="Browse chapters by subject."
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
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
    </div>
  );
}
