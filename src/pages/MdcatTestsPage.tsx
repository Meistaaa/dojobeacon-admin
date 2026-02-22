import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MdcatTestCard from "../components/mdcat/MdcatTestCard";
import MdcatYearFilter from "../components/mdcat/MdcatYearFilter";
import MdcatUploadForm from "../components/mdcat/MdcatUploadForm";
import { Button } from "../components/ui/button";
import { getMdcatTests, startTest } from "../lib/testsApi";
import type { StartTestResponse, TestSummary } from "../types/tests";
import { useAuthStore } from "../stores/authStore";

export default function MdcatTestsPage() {
  const role = useAuthStore((state) => state.user?.role?.toLowerCase() || "");
  const isAdmin = role === "admin" || role === "super_admin";
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startResult, setStartResult] = useState<StartTestResponse | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    const loadYears = async () => {
      try {
        const all: TestSummary[] = await getMdcatTests();
        const sortedYears = Array.from(
          new Set(
            all
              .map((test: TestSummary) => test.year)
              .filter((year): year is number => typeof year === "number")
          )
        ).sort((a: number, b: number) => b - a);
        setYears(sortedYears);
      } catch {
        // Year options are optional UI sugar; do not block list rendering if this fails.
        setYears([]);
      }
    };

    void loadYears();
  }, []);

  useEffect(() => {
    const loadByYear = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: TestSummary[] = await getMdcatTests({
          year: selectedYear === "" ? undefined : selectedYear,
        });
        const sorted = [...data].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        setTests(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load MD-CAT tests.");
      } finally {
        setLoading(false);
      }
    };

    void loadByYear();
  }, [selectedYear]);

  const grouped = useMemo(() => {
    const map = new Map<number, TestSummary[]>();
    tests.forEach((test) => {
      const year = test.year ?? 0;
      if (!map.has(year)) map.set(year, []);
      map.get(year)?.push(test);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [tests]);

  const handleStart = async (testId: string) => {
    try {
      setStartingId(testId);
      setError(null);
      const result = await startTest(testId);
      setStartResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start MD-CAT test.");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MD-CAT Tests"
        description="Browse MD-CAT yearly tests and start attempts."
        action={
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                Upload Questions / Question Bank
              </Button>
            ) : null}
            <MdcatYearFilter
              years={years}
              selectedYear={selectedYear}
              onChange={setSelectedYear}
              disabled={loading}
            />
          </div>
        }
      />

      {startResult ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium">MD-CAT test started successfully.</p>
          <p className="text-muted-foreground">
            {startResult.test.title} ({startResult.test.year ?? "N/A"}) | Attempt:{" "}
            {startResult.attempt?._id || startResult.attempt?.id || "N/A"} | Questions:{" "}
            {startResult.questions.length}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center h-56">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          No MD-CAT test available for this year.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([year, items]) => (
            <section key={year} className="space-y-3">
              <h2 className="text-lg font-semibold">{year || "Unknown year"}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((test) => (
                  <MdcatTestCard
                    key={test._id}
                    test={test}
                    onStart={handleStart}
                    starting={startingId === test._id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {uploadDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">Upload MD-CAT Questions / Question Bank</h2>
                <p className="text-sm text-muted-foreground">
                  Upload CSV/XLSX file to create MD-CAT yearly test.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(false)}>
                Close
              </Button>
            </div>
            <div className="max-h-[75vh] overflow-auto p-4">
              <MdcatUploadForm />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
