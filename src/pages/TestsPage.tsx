import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { paginate, buildPagination } from "../lib/pagination";
import type { PaginationState } from "../lib/pagination";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Loader2 } from "lucide-react";

interface Test {
  _id: string;
  title: string;
  description?: string;
  subjects: string[];
  chapters: string[];
  duration: number;
  totalMarks: number;
  difficulty?: string;
}

interface Subject {
  _id: string;
  name: string;
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 10 });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [testsData, subjectsData] = await Promise.all([
        apiFetch<Test[]>("/tests"),
        apiFetch<Subject[]>("/subjects"),
      ]);
      setTests(testsData || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load tests");
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
    return tests.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficultyFilter === "all" || t.difficulty === difficultyFilter;
      const matchesSubject =
        subjectFilter === "all" || (t.subjects || []).some((id) => id === subjectFilter);
      return matchesSearch && matchesDifficulty && matchesSubject;
    });
  }, [tests, search, difficultyFilter, subjectFilter]);

  const paged = paginate(filtered, pagination);
  const paginationInfo = buildPagination(filtered.length, pagination);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests"
        description="Manage practice tests."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter tests.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Search title/description" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
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
            <CardTitle className="text-lg">Tests</CardTitle>
            <CardDescription>{filtered.length} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Subjects</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Difficulty</th>
                    <th className="px-3 py-2">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((test) => (
                    <tr key={test._id} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium">{test.title}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {test.subjects.map((id) => (
                            <Badge key={id} variant="secondary">
                              {subjectMap.get(id) || "Subject"}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">{test.duration} mins</td>
                      <td className="px-3 py-2 capitalize">{test.difficulty || "mixed"}</td>
                      <td className="px-3 py-2">{test.totalMarks}</td>
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
    </div>
  );
}
