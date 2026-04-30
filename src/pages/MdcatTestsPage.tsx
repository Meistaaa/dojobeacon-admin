import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MdcatTestCard from "../components/mdcat/MdcatTestCard";
import MdcatYearFilter from "../components/mdcat/MdcatYearFilter";
import MdcatUploadForm from "../components/mdcat/MdcatUploadForm";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getMdcatTests, getTestById } from "../lib/testsApi";
import type { TestDetail, TestQuestion, TestSummary } from "../types/tests";
import { useAuthStore } from "../stores/authStore";

type NormalizedOption = {
  text: string;
  isCorrect: boolean;
};

const normalizeOptions = (question: TestQuestion): NormalizedOption[] => {
  if (!Array.isArray(question.options)) return [];

  return question.options.map((option) => {
    if (typeof option === "string") {
      return { text: option, isCorrect: false };
    }

    return {
      text: option?.text ?? "",
      isCorrect: !!(option?.isCorrect ?? option?.is_correct ?? option?.correct),
    };
  });
};

const getCorrectAnswer = (question: TestQuestion, options: NormalizedOption[]) => {
  if (question.correctAnswer) return question.correctAnswer;
  if (question.type === "fill_blank") return question.answer ?? "";
  return options.find((option) => option.isCorrect)?.text ?? question.answer ?? "";
};

const getRelationName = (value?: string | { _id: string; name: string }) => {
  if (!value) return "";
  return typeof value === "string" ? value : value.name;
};

export default function MdcatTestsPage() {
  const role = useAuthStore((state) => state.user?.role?.toLowerCase() || "");
  const isAdmin = role === "admin" || role === "super_admin";
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
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

  const handleView = async (testId: string) => {
    try {
      setViewingId(testId);
      setViewError(null);
      const result = await getTestById(testId);
      setSelectedTest(result);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "Failed to load MD-CAT test.");
    } finally {
      setViewingId(null);
    }
  };

  const closeViewDialog = () => {
    setSelectedTest(null);
    setViewError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MD-CAT Tests"
        description="Browse MD-CAT yearly tests and review their questions."
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
                    onView={handleView}
                    viewing={viewingId === test._id}
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

      {(selectedTest || viewError) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-5xl rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedTest?.title ?? "View MD-CAT Test"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Inspect the test details and all included questions.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={closeViewDialog}>
                Close
              </Button>
            </div>

            <div className="max-h-[80vh] overflow-auto p-4">
              {viewError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {viewError}
                </div>
              ) : selectedTest ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedTest.description ? (
                        <p className="text-sm text-muted-foreground">{selectedTest.description}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <p>
                          <span className="text-muted-foreground">Year:</span>{" "}
                          {selectedTest.year ?? "-"}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Duration:</span>{" "}
                          {selectedTest.duration} mins
                        </p>
                        <p>
                          <span className="text-muted-foreground">Total marks:</span>{" "}
                          {selectedTest.totalMarks ?? "-"}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Questions:</span>{" "}
                          {selectedTest.questions?.length ?? 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTest.questions?.length ? (
                        <div className="space-y-4">
                          {selectedTest.questions.map((question, index) => {
                            const options = normalizeOptions(question);
                            const correctAnswer = getCorrectAnswer(question, options);
                            const subjectName = getRelationName(question.subject);
                            const chapterName = getRelationName(question.chapter);

                            return (
                              <div key={question._id || `${selectedTest._id}-${index}`} className="rounded-xl border border-border p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                      Question {index + 1}
                                    </p>
                                    <p className="text-base font-medium">{question.text}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {question.type ? (
                                      <span className="rounded-full border border-border px-2 py-1 uppercase">
                                        {question.type.replace("_", " ")}
                                      </span>
                                    ) : null}
                                    {subjectName ? (
                                      <span className="rounded-full border border-border px-2 py-1">
                                        {subjectName}
                                      </span>
                                    ) : null}
                                    {chapterName ? (
                                      <span className="rounded-full border border-border px-2 py-1">
                                        {chapterName}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {options.length ? (
                                  <div className="mt-4 space-y-2">
                                    {options.map((option, optionIndex) => (
                                      <div
                                        key={`${question._id || index}-option-${optionIndex}`}
                                        className={`rounded-lg border px-3 py-2 text-sm ${
                                          option.isCorrect
                                            ? "border-primary/40 bg-primary/5"
                                            : "border-border"
                                        }`}
                                      >
                                        {option.text || `Option ${optionIndex + 1}`}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                <div className="mt-4 text-sm">
                                  <span className="text-muted-foreground">Correct answer:</span>{" "}
                                  {correctAnswer || "-"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
                          No questions were returned for this test.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
