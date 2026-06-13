import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  getTestById,
  getSubjects,
  getChapters,
  createTestQuestion,
  updateQuestion,
  deleteTestQuestion,
} from "../../lib/testsApi";
import type {
  QuestionType,
  TestQuestion,
  TestQuestionOption,
  TestSummary,
} from "../../types/tests";

// Question options may arrive as plain strings or option objects with varied flags.
const optText = (o: string | TestQuestionOption) =>
  typeof o === "string" ? o : o.text ?? "";
const optCorrect = (o: string | TestQuestionOption) =>
  typeof o === "string" ? false : !!(o.isCorrect ?? o.is_correct ?? o.correct);

type MdcatTestEditorProps = {
  testId: string;
  onClose: () => void;
};

type Subject = { _id: string; name: string };
type Chapter = { _id: string; name: string; subject: { _id: string } | string };

type QuestionForm = {
  _id?: string;
  text: string;
  type: QuestionType;
  subject: string;
  chapter: string;
  options: { text: string; isCorrect: boolean }[];
  answer: string;
};

const MCQ_OPTIONS = () => [
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
];

const EMPTY_FORM: QuestionForm = {
  text: "",
  type: "mcq",
  subject: "",
  chapter: "",
  options: MCQ_OPTIONS(),
  answer: "",
};

const getChapterSubjectId = (chapter: Chapter) =>
  typeof chapter.subject === "string"
    ? chapter.subject
    : chapter.subject?._id ?? "";

const idOf = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

export default function MdcatTestEditor({ testId, onClose }: MdcatTestEditorProps) {
  const [test, setTest] = useState<TestSummary | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<QuestionForm | null>(null);
  const [search, setSearch] = useState("");
  const isEditing = !!form?._id;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [t, s, c] = await Promise.all([
        getTestById(testId),
        getSubjects(),
        getChapters(),
      ]);
      setTest(t);
      setSubjects(s || []);
      setChapters(c || []);
    } catch {
      setError("Failed to load test questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const questions = useMemo(() => test?.questions ?? [], [test]);

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        (item.answer?.toLowerCase().includes(q) ?? false) ||
        item.options?.some((o) => optText(o).toLowerCase().includes(q)),
    );
  }, [questions, search]);

  const subjectChapters = useMemo(() => {
    if (!form?.subject) return chapters;
    return chapters.filter((c) => getChapterSubjectId(c) === form.subject);
  }, [chapters, form?.subject]);

  const correctAnswerOf = (q: TestQuestion) =>
    q.correctAnswer ||
    (q.type === "fill_blank"
      ? q.answer
      : (() => {
          const correct = q.options?.find(optCorrect);
          return correct ? optText(correct) : q.answer;
        })());

  /* ---------- form open helpers ---------- */

  const openCreate = () =>
    setForm({
      ...EMPTY_FORM,
      options: MCQ_OPTIONS(),
      subject: test?.subjects?.[0]?._id ?? "",
      chapter: test?.chapters?.[0]?._id ?? "",
    });

  const openEdit = (q: TestQuestion) => {
    const options =
      q.type === "fill_blank"
        ? []
        : q.options?.length
          ? q.options.map((o) => ({ text: optText(o), isCorrect: optCorrect(o) }))
          : MCQ_OPTIONS();
    if (q.type !== "fill_blank" && !options.some((o) => o.isCorrect)) {
      options[0] = { ...options[0], isCorrect: true };
    }
    setForm({
      _id: q._id,
      text: q.text,
      type: q.type as QuestionType,
      subject: idOf(q.subject),
      chapter: idOf(q.chapter),
      options,
      answer: q.answer || "",
    });
  };

  /* ---------- option handlers ---------- */

  const setOptionText = (index: number, text: string) =>
    setForm((p) =>
      p
        ? {
            ...p,
            options: p.options.map((o, i) => (i === index ? { ...o, text } : o)),
          }
        : p,
    );

  const setOptionCorrect = (index: number) =>
    setForm((p) =>
      p
        ? {
            ...p,
            options: p.options.map((o, i) => ({ ...o, isCorrect: i === index })),
          }
        : p,
    );

  const setType = (type: QuestionType) =>
    setForm((p) => {
      if (!p) return p;
      let options: { text: string; isCorrect: boolean }[] = [];
      if (type === "mcq") {
        options =
          p.type === "mcq" && p.options.length ? p.options : MCQ_OPTIONS();
      } else if (type === "true_false") {
        options =
          p.type === "true_false" && p.options.length
            ? p.options
            : [
                { text: "True", isCorrect: true },
                { text: "False", isCorrect: false },
              ];
      }
      return { ...p, type, options, answer: type === "fill_blank" ? p.answer : "" };
    });

  /* ---------- submit ---------- */

  const submit = async () => {
    if (!form) return;

    if (!form.text.trim() || !form.subject || !form.chapter) {
      setError("Question text, subject and chapter are required.");
      return;
    }

    if (form.type === "fill_blank") {
      if (!form.answer.trim()) {
        setError("Correct answer is required.");
        return;
      }
    } else {
      if (form.options.filter((o) => o.isCorrect).length !== 1) {
        setError("Select exactly one correct option.");
        return;
      }
      if (form.options.some((o) => !o.text.trim())) {
        setError("All options must have text.");
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const base: Record<string, unknown> = {
        text: form.text.trim(),
        type: form.type,
        subject: form.subject,
        chapter: form.chapter,
      };
      if (form.type === "fill_blank") {
        base.answer = form.answer.trim();
      } else {
        base.options = form.options;
      }

      if (form._id) {
        await updateQuestion(form._id, base);
      } else {
        await createTestQuestion(testId, base);
      }

      setForm(null);
      await load();
    } catch {
      setError(
        form._id ? "Failed to update question." : "Failed to create question.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm("Delete this question from the test?")) return;
    try {
      setError(null);
      await deleteTestQuestion(testId, questionId);
      await load();
    } catch {
      setError("Failed to delete question.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">
              {test ? test.title : "MD-CAT Test"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {test?.year ? `${test.year} • ` : ""}
              {questions.length}{" "}
              {questions.length === 1 ? "question" : "questions"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mx-4 mt-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No questions in this test yet. Click "Add Question" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Search questions by text, option or answer"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filteredQuestions.length === 0 ? (
                <div className="rounded-xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No questions match "{search}".
                </div>
              ) : (
                <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left w-12">#</th>
                    <th className="p-2 text-left">Text</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Correct Answer</th>
                    <th className="p-2 text-left w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((q, i) => (
                    <tr key={q._id} className="border-t">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">{q.text}</td>
                      <td className="p-2 uppercase">{q.type}</td>
                      <td className="p-2">{correctAnswerOf(q) || "—"}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label="Edit question"
                            onClick={() => openEdit(q)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                            aria-label="Delete question"
                            onClick={() => handleDelete(q._id)}
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUESTION FORM MODAL */}
      {form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded-xl bg-background p-6">
            <h3 className="text-lg font-semibold">
              {isEditing ? "Edit Question" : "Add Question"}
            </h3>

            <Input
              placeholder="Question text"
              value={form.text}
              onChange={(e) =>
                setForm((p) => (p ? { ...p, text: e.target.value } : p))
              }
            />

            <select
              className="h-10 rounded border px-3"
              value={form.type}
              onChange={(e) => setType(e.target.value as QuestionType)}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded border px-3"
                value={form.subject}
                onChange={(e) =>
                  setForm((p) =>
                    p ? { ...p, subject: e.target.value, chapter: "" } : p,
                  )
                }
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded border px-3"
                value={form.chapter}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, chapter: e.target.value } : p))
                }
              >
                <option value="">Select chapter</option>
                {subjectChapters.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {form.type === "fill_blank" && (
              <Input
                placeholder="Correct answer"
                value={form.answer}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, answer: e.target.value } : p))
                }
              />
            )}

            {form.type === "mcq" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter four options and mark the correct one.
                </p>
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={o.text}
                      onChange={(e) => setOptionText(i, e.target.value)}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mdcat-correct"
                        checked={o.isCorrect}
                        onChange={() => setOptionCorrect(i)}
                        className="h-4 w-4"
                      />
                      <span>Mark correct</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {form.type === "true_false" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Choose which option is correct.
                </p>
                {form.options.map((o, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="mdcat-correct"
                      checked={o.isCorrect}
                      onChange={() => setOptionCorrect(i)}
                      className="h-4 w-4"
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
