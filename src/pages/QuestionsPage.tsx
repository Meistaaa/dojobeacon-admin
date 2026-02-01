import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Upload,
  Eye,
  ArrowLeft,
} from "lucide-react";

/* ================= TYPES ================= */

type SubjectType = "mdcat" | "o_levels" | "a_levels";

interface Subject {
  _id: string;
  name: string;
  description?: string;
  type?: SubjectType;
}

interface Chapter {
  _id: string;
  name: string;
  subject: { _id: string; name: string } | string;
  description?: string;
}

interface Question {
  _id: string;
  text: string;
  type: "mcq" | "true_false" | "fill_blank";
  subject: string;
  chapter: string;
  correctAnswer?: string;
  options?: {
    text: string;
    isCorrect: boolean;
  }[];
  answer?: string;
}

type IncomingOption =
  | string
  | {
      text?: string;
      isCorrect?: boolean;
      is_correct?: boolean;
      correct?: boolean;
    };

type NewQuestionForm = {
  text: string;
  type: Question["type"];
  subject: string;
  chapter: string;
  options: { text: string; isCorrect: boolean }[];
  answer: string;
};
type EditQuestionForm = NewQuestionForm & { _id: string };

type SubjectForm = {
  name: string;
  description: string;
  type: SubjectType;
};

type ChapterForm = {
  name: string;
  description: string;
  subject: string;
};

const SUBJECT_TYPES: SubjectType[] = ["mdcat", "o_levels", "a_levels"];
const EMPTY_SUBJECT_FORM: SubjectForm = {
  name: "",
  description: "",
  type: "mdcat",
};
const EMPTY_CHAPTER_FORM: ChapterForm = {
  name: "",
  description: "",
  subject: "",
};

const getChapterSubjectId = (chapter: Chapter) => {
  if (typeof chapter.subject === "string") return chapter.subject;
  return chapter.subject?._id ?? "";
};

/* ================= COMPONENT ================= */

type ViewMode = "subjects" | "chapters" | "questions";

export default function QuestionsPage() {
  /* ---------- DATA ---------- */
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  /* ---------- NAVIGATION STATE ---------- */
  const [viewMode, setViewMode] = useState<ViewMode>("subjects");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  /* ---------- UI STATE ---------- */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadChapterIdRef = useRef<string | null>(null);
  const [subjectForm, setSubjectForm] =
    useState<SubjectForm>(EMPTY_SUBJECT_FORM);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectProcessing, setSubjectProcessing] = useState(false);
  const [chapterForm, setChapterForm] =
    useState<ChapterForm>(EMPTY_CHAPTER_FORM);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterProcessing, setChapterProcessing] = useState(false);

  /* ---------- FILTERS (for questions view) ---------- */
  const [search, setSearch] = useState("");

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });

  /* ---------- CREATE FORM ---------- */
  const [newQuestion, setNewQuestion] = useState<NewQuestionForm>({
    text: "",
    type: "mcq",
    subject: "",
    chapter: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    answer: "",
  });
  const [editingQuestion, setEditingQuestion] =
    useState<EditQuestionForm | null>(null);

  /* ================= LOAD DATA ================= */

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [q, s, c] = await Promise.all([
        apiFetch<Question[]>("/questions"),
        apiFetch<Subject[]>("/subjects"),
        apiFetch<Chapter[]>("/chapters"),
      ]);

      // Ensure every option carries an explicit isCorrect flag for the UI
      const normalizedQuestions =
        (q ?? []).map((question: Question) => {
          const options = Array.isArray(question.options)
            ? question.options.map((opt: IncomingOption) => {
                if (typeof opt === "string") {
                  return { text: opt, isCorrect: false };
                }

                const { text = "", isCorrect, is_correct, correct } = opt || {};
                return {
                  text,
                  isCorrect: !!(isCorrect ?? is_correct ?? correct),
                };
              })
            : [];

          const correctAnswer =
            question.correctAnswer ||
            (question.type === "fill_blank"
              ? question.answer
              : options?.find((opt) => opt.isCorrect)?.text || question.answer);

          return {
            ...question,
            options,
            correctAnswer,
          };
        }) || [];

      setQuestions(normalizedQuestions);
      setSubjects(s || []);
      setChapters(c || []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= MAPS ================= */

  const chapterMap = useMemo(() => {
    const map = new Map<string, Chapter>();
    chapters.forEach((c) => map.set(c._id, c));
    return map;
  }, [chapters]);

  /* ================= QUESTION COUNTS ================= */

  // Get question count for a subject
  const getSubjectQuestionCount = (subjectId: string) => {
    return questions.filter((q) => q.subject === subjectId).length;
  };

  // Get question count for a chapter
  const getChapterQuestionCount = (chapterId: string) => {
    return questions.filter((q) => q.chapter === chapterId).length;
  };

  // Get chapters for selected subject
  const subjectChapters = useMemo(() => {
    if (!selectedSubject) return [];
    return chapters.filter((c) => getChapterSubjectId(c) === selectedSubject);
  }, [chapters, selectedSubject]);

  /* ================= FILTER (for questions view) ================= */

  const filtered = useMemo(() => {
    if (viewMode !== "questions" || !selectedChapter) return [];
    return questions.filter((q) => {
      return (
        q.chapter === selectedChapter &&
        q.text.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [questions, search, selectedChapter, viewMode]);

  const paged = paginate(filtered, pagination);
  const paginationInfo = buildPagination(filtered.length, pagination);

  // Reset to first page when filters/search change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [search, selectedChapter]);

  /* ================= OPTIONS ================= */

  const handleOptionChange = (index: number, text: string) => {
    setNewQuestion((prev) => {
      const options = [...prev.options];
      options[index] = { ...options[index], text };
      return { ...prev, options };
    });
  };

  const handleOptionCorrect = (index: number) => {
    setNewQuestion((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => ({
        ...o,
        isCorrect: i === index,
      })),
    }));
  };

  const handleEditOptionChange = (index: number, text: string) => {
    setEditingQuestion((prev) => {
      if (!prev) return prev;
      const options = [...prev.options];
      options[index] = { ...options[index], text };
      return { ...prev, options };
    });
  };

  const handleEditOptionCorrect = (index: number) => {
    setEditingQuestion((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        options: prev.options.map((o, i) => ({ ...o, isCorrect: i === index })),
      };
    });
  };

  /* ================= SUBMIT ================= */

  const submitSingle = async () => {
    if (!newQuestion.text || !newQuestion.subject || !newQuestion.chapter) {
      setError("Question text, subject and chapter are required.");
      return;
    }

    if (newQuestion.type !== "fill_blank") {
      const correctCount = newQuestion.options.filter(
        (o) => o.isCorrect,
      ).length;

      if (correctCount !== 1) {
        setError("Select exactly one correct option.");
        return;
      }

      if (newQuestion.options.some((o) => !o.text.trim())) {
        setError("All options must have text.");
        return;
      }
    }

    if (newQuestion.type === "fill_blank" && !newQuestion.answer.trim()) {
      setError("Correct answer is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const formData = new FormData();
      formData.append("text", newQuestion.text);
      formData.append("type", newQuestion.type);
      formData.append("subject", newQuestion.subject);
      formData.append("chapter", newQuestion.chapter);

      if (newQuestion.type !== "fill_blank") {
        formData.append("options", JSON.stringify(newQuestion.options));
      }

      if (newQuestion.type === "fill_blank") {
        formData.append("answer", newQuestion.answer);
      }

      await apiFetch("/questions", {
        method: "POST",
        data: formData,
      });

      await load();
      setShowAddDialog(false);

      setNewQuestion({
        text: "",
        type: "mcq",
        subject: selectedSubject || "",
        chapter: selectedChapter || "",
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        answer: "",
      });
    } catch {
      setError("Failed to create question");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editingQuestion) return;

    if (
      !editingQuestion.text ||
      !editingQuestion.subject ||
      !editingQuestion.chapter
    ) {
      setError("Question text, subject and chapter are required.");
      return;
    }

    if (editingQuestion.type !== "fill_blank") {
      const correctCount = editingQuestion.options.filter(
        (o) => o.isCorrect,
      ).length;

      if (correctCount !== 1) {
        setError("Select exactly one correct option.");
        return;
      }

      if (editingQuestion.options.some((o) => !o.text.trim())) {
        setError("All options must have text.");
        return;
      }
    }

    if (
      editingQuestion.type === "fill_blank" &&
      !editingQuestion.answer.trim()
    ) {
      setError("Correct answer is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Partial<Question> & { options?: any } = {
        text: editingQuestion.text,
        type: editingQuestion.type,
        subject: editingQuestion.subject,
        chapter: editingQuestion.chapter,
      };

      if (editingQuestion.type !== "fill_blank") {
        payload.options = editingQuestion.options;
        payload.answer = undefined;
      } else {
        payload.answer = editingQuestion.answer;
        payload.options = undefined;
      }

      await apiFetch(`/questions/${editingQuestion._id}`, {
        method: "PUT",
        data: payload,
        headers: { "Content-Type": "application/json" },
      });

      await load();
      setEditingQuestion(null);
    } catch {
      setError("Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await apiFetch(`/questions/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Failed to delete question");
    }
  };

  const handleUploadChange = async (
    file: File | undefined,
    chapterId?: string,
  ) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (chapterId) {
      formData.append("chapter", chapterId);
    }

    try {
      setUploading(true);
      setError(null);
      await apiFetch("/questions/upload/hierarchy-excel", {
        method: "POST",
        data: formData,
      });
      await load();
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  /* ================= NAVIGATION HANDLERS ================= */

  const handleSubjectClick = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedChapter(null);
    setViewMode("chapters");
  };

  const handleChapterView = (chapterId: string) => {
    setSelectedChapter(chapterId);
    setViewMode("questions");
    setPagination({ page: 1, pageSize: 10 });
  };

  const handleChapterUpload = (chapterId: string) => {
    uploadChapterIdRef.current = chapterId;
    fileInputRef.current?.click();
  };

  const handleBackToSubjects = () => {
    setViewMode("subjects");
    setSelectedSubject(null);
    setSelectedChapter(null);
  };

  const handleBackToChapters = () => {
    setViewMode("chapters");
    setSelectedChapter(null);
  };

  const openSubjectModal = (subject?: Subject) => {
    setEditingSubject(subject ?? null);
    setSubjectForm({
      name: subject?.name ?? "",
      description: subject?.description ?? "",
      type: subject?.type ?? "mdcat",
    });
    setShowSubjectModal(true);
  };

  const closeSubjectModal = () => {
    setShowSubjectModal(false);
    setEditingSubject(null);
    setSubjectForm({ ...EMPTY_SUBJECT_FORM });
  };

  const submitSubjectForm = async () => {
    if (!subjectForm.name.trim()) {
      setError("Subject name is required.");
      return;
    }

    const payload = {
      name: subjectForm.name.trim(),
      description: subjectForm.description.trim(),
      type: subjectForm.type,
    };

    try {
      setSubjectProcessing(true);
      setError(null);

      if (editingSubject) {
        await apiFetch(`/subjects/${editingSubject._id}`, {
          method: "PUT",
          data: payload,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await apiFetch("/subjects", {
          method: "POST",
          data: payload,
          headers: { "Content-Type": "application/json" },
        });
      }

      await load();
      closeSubjectModal();
    } catch {
      setError(
        editingSubject
          ? "Failed to update subject"
          : "Failed to create subject",
      );
    } finally {
      setSubjectProcessing(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      await apiFetch(`/subjects/${subjectId}`, { method: "DELETE" });
      if (selectedSubject === subjectId) {
        handleBackToSubjects();
      }
      await load();
    } catch {
      setError("Failed to delete subject");
    }
  };

  const openChapterModal = (chapter?: Chapter) => {
    const subjectId = chapter
      ? getChapterSubjectId(chapter)
      : selectedSubject || "";
    setEditingChapter(chapter ?? null);
    setChapterForm({
      name: chapter?.name ?? "",
      description: chapter?.description ?? "",
      subject: subjectId,
    });
    setShowChapterModal(true);
  };

  const closeChapterModal = () => {
    setShowChapterModal(false);
    setEditingChapter(null);
    setChapterForm({
      ...EMPTY_CHAPTER_FORM,
      subject: selectedSubject || "",
    });
  };

  const submitChapterForm = async () => {
    if (!chapterForm.name.trim() || !chapterForm.subject) {
      setError("Chapter name and subject are required.");
      return;
    }

    const payload = {
      name: chapterForm.name.trim(),
      description: chapterForm.description.trim(),
      subject: chapterForm.subject,
    };

    try {
      setChapterProcessing(true);
      setError(null);

      if (editingChapter) {
        await apiFetch(`/chapters/${editingChapter._id}`, {
          method: "PUT",
          data: payload,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        await apiFetch("/chapters", {
          method: "POST",
          data: payload,
          headers: { "Content-Type": "application/json" },
        });
      }

      await load();
      closeChapterModal();
    } catch {
      setError(
        editingChapter
          ? "Failed to update chapter"
          : "Failed to create chapter",
      );
    } finally {
      setChapterProcessing(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm("Delete this chapter?")) return;
    try {
      await apiFetch(`/chapters/${chapterId}`, { method: "DELETE" });
      if (selectedChapter === chapterId) {
        handleBackToChapters();
      }
      await load();
    } catch {
      setError("Failed to delete chapter");
    }
  };

  /* ================= UI ================= */

  // SUBJECTS VIEW
  const renderSubjectsView = () => (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            Select a subject to view its chapters
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => openSubjectModal()}>
          <Plus className="h-4 w-4 mr-2" />
          New Subject
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {subjects.map((subject) => {
            const questionCount = getSubjectQuestionCount(subject._id);
            return (
              <div
                key={subject._id}
                className="flex items-start gap-4 justify-between p-4 border-b border-border/70 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => handleSubjectClick(subject._id)}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-base">
                      {subject.name}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {questionCount}{" "}
                      {questionCount === 1 ? "Question" : "Questions"}
                    </span>
                  </div>
                  {subject.description && (
                    <p className="text-sm text-muted-foreground">
                      {subject.description}
                    </p>
                  )}
                </div>
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9"
                    aria-label="Edit subject"
                    onClick={() => openSubjectModal(subject)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                    aria-label="Delete subject"
                    onClick={() => handleDeleteSubject(subject._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  // CHAPTERS VIEW
  const renderChaptersView = () => {
    const selectedSubjectName =
      subjects.find((s) => s._id === selectedSubject)?.name || "Subject";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBackToSubjects}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{selectedSubjectName}</h2>
            <p className="text-sm text-muted-foreground">
              {getSubjectQuestionCount(selectedSubject || "")} total questions
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Chapters</CardTitle>
              <CardDescription>
                Select a chapter to view or upload questions
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openChapterModal()}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chapter
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {subjectChapters.map((chapter) => {
                const questionCount = getChapterQuestionCount(chapter._id);
                return (
                  <div
                    key={chapter._id}
                    className="flex flex-col gap-3 p-4 border-b border-border/70"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-base">
                            {chapter.name}
                          </p>
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            {questionCount}{" "}
                            {questionCount === 1 ? "question" : "questions"}
                          </span>
                        </div>
                        {chapter.description && (
                          <p className="text-sm text-muted-foreground">
                            {chapter.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChapterUpload(chapter._id)}
                          disabled={uploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleChapterView(chapter._id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label="Edit chapter"
                            onClick={() => openChapterModal(chapter)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                            aria-label="Delete chapter"
                            onClick={() => handleDeleteChapter(chapter._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {subjectChapters.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No chapters found for this subject
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // QUESTIONS VIEW
  const renderQuestionsView = () => {
    const selectedSubjectName =
      subjects.find((s) => s._id === selectedSubject)?.name || "Subject";
    const selectedChapterName =
      chapterMap.get(selectedChapter || "")?.name || "Chapter";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBackToChapters}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chapters
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              {selectedSubjectName} - {selectedChapterName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length}{" "}
              {filtered.length === 1 ? "question" : "questions"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Search questions in this chapter</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search question"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>{filtered.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No questions found in this chapter
              </div>
            ) : (
              <>
                <div className="overflow-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Text</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Correct Answer</th>
                        <th className="p-2 text-left w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((q) => {
                        const correctAnswer =
                          q.correctAnswer ||
                          (q.type === "fill_blank"
                            ? q.answer
                            : q.options?.find((o) => o.isCorrect)?.text ||
                              q.answer);

                        return (
                          <tr key={q._id} className="border-t">
                            <td className="p-2">{q.text}</td>
                            <td className="p-2 uppercase">{q.type}</td>
                            <td className="p-2">{correctAnswer || "—"}</td>
                            <td className="p-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-9"
                                aria-label="Edit question"
                                onClick={() => {
                                  const clonedOptions =
                                    q.type === "fill_blank"
                                      ? []
                                      : q.options?.length
                                        ? q.options.map((opt) => ({
                                            text: opt.text,
                                            isCorrect: !!opt.isCorrect,
                                          }))
                                        : [
                                            { text: "", isCorrect: true },
                                            { text: "", isCorrect: false },
                                            { text: "", isCorrect: false },
                                            { text: "", isCorrect: false },
                                          ];

                                  if (
                                    q.type !== "fill_blank" &&
                                    clonedOptions.length &&
                                    !clonedOptions.some((o) => o.isCorrect)
                                  ) {
                                    clonedOptions[0] = {
                                      ...clonedOptions[0],
                                      isCorrect: true,
                                    };
                                  }

                                  setEditingQuestion({
                                    _id: q._id,
                                    text: q.text,
                                    type: q.type,
                                    subject: q.subject,
                                    chapter: q.chapter,
                                    options: clonedOptions,
                                    answer: q.answer || "",
                                  });
                                }}
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {paginationInfo.pageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: p.page - 1 }))
                      }
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagination.page >= paginationInfo.pageCount}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: p.page + 1 }))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ADD QUESTION MODAL */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add New Question</h3>
            <Input
              placeholder="Question text"
              value={newQuestion.text}
              onChange={(e) =>
                setNewQuestion((p) => ({ ...p, text: e.target.value }))
              }
            />

            <select
              className="h-10 rounded border px-3"
              value={newQuestion.type}
              onChange={(e) => {
                const newType = e.target.value as Question["type"];
                setNewQuestion((p) => {
                  let options: { text: string; isCorrect: boolean }[] = [];
                  if (newType === "mcq") {
                    options = [
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                    ];
                  } else if (newType === "true_false") {
                    options = [
                      { text: "True", isCorrect: true },
                      { text: "False", isCorrect: false },
                    ];
                  }
                  return {
                    ...p,
                    type: newType,
                    options,
                    answer: "",
                  };
                });
              }}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded border px-3"
                value={newQuestion.subject || selectedSubject || ""}
                onChange={(e) =>
                  setNewQuestion((p) => ({
                    ...p,
                    subject: e.target.value,
                    chapter: "",
                  }))
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
                value={newQuestion.chapter || selectedChapter || ""}
                onChange={(e) =>
                  setNewQuestion((p) => ({ ...p, chapter: e.target.value }))
                }
              >
                <option value="">Select chapter</option>
                {chapters
                  .filter((c) => {
                    if (!newQuestion.subject && !selectedSubject) {
                      return true;
                    }
                    const filterSubject = newQuestion.subject || selectedSubject;
                    return getChapterSubjectId(c) === filterSubject;
                  })
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            {newQuestion.type === "fill_blank" && (
              <Input
                placeholder="Correct answer"
                value={newQuestion.answer}
                onChange={(e) =>
                  setNewQuestion((p) => ({ ...p, answer: e.target.value }))
                }
              />
            )}

            {newQuestion.type === "mcq" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter four options and mark the correct one.
                </p>
                {newQuestion.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={o.text}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="correct"
                        checked={o.isCorrect}
                        onChange={() => handleOptionCorrect(i)}
                        className="h-4 w-4"
                      />
                      <span>Mark correct</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {newQuestion.type === "true_false" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Choose which option is correct.
                </p>
                {newQuestion.options.map((o, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="correct"
                      checked={o.isCorrect}
                      onChange={() => handleOptionCorrect(i)}
                      className="h-4 w-4"
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitSingle} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUESTION MODAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-background p-6 space-y-4">
            <Input
              placeholder="Question text"
              value={editingQuestion.text}
              onChange={(e) =>
                setEditingQuestion((p) =>
                  p ? { ...p, text: e.target.value } : p,
                )
              }
            />

            <select
              className="h-10 rounded border px-3"
              value={editingQuestion.type}
              onChange={(e) => {
                const newType = e.target.value as Question["type"];
                setEditingQuestion((p) => {
                  if (!p) return p;
                  let options: { text: string; isCorrect: boolean }[] = [];
                  if (newType === "mcq") {
                    options =
                      p.options?.length && p.type === "mcq"
                        ? p.options
                        : [
                            { text: "", isCorrect: true },
                            { text: "", isCorrect: false },
                            { text: "", isCorrect: false },
                            { text: "", isCorrect: false },
                          ];
                  } else if (newType === "true_false") {
                    options =
                      p.type === "true_false" && p.options?.length
                        ? p.options
                        : [
                            { text: "True", isCorrect: true },
                            { text: "False", isCorrect: false },
                          ];
                  }
                  return {
                    ...p,
                    type: newType,
                    options,
                    answer: newType === "fill_blank" ? p.answer || "" : "",
                  };
                });
              }}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded border px-3"
                value={editingQuestion.subject}
                onChange={(e) =>
                  setEditingQuestion((p) =>
                    p
                      ? {
                          ...p,
                          subject: e.target.value,
                          chapter: "",
                        }
                      : p,
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
                value={editingQuestion.chapter}
                onChange={(e) =>
                  setEditingQuestion((p) =>
                    p ? { ...p, chapter: e.target.value } : p,
                  )
                }
              >
                <option value="">Select chapter</option>
                {chapters
                  .filter((c) => {
                    if (!editingQuestion.subject) {
                      return true;
                    }
                    return getChapterSubjectId(c) === editingQuestion.subject;
                  })
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            {editingQuestion.type === "fill_blank" && (
              <Input
                placeholder="Correct answer"
                value={editingQuestion.answer}
                onChange={(e) =>
                  setEditingQuestion((p) =>
                    p ? { ...p, answer: e.target.value } : p,
                  )
                }
              />
            )}

            {editingQuestion.type === "mcq" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Edit four options and mark the correct one.
                </p>
                {editingQuestion.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={o.text}
                      onChange={(e) =>
                        handleEditOptionChange(i, e.target.value)
                      }
                      className="flex-1"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="edit-correct"
                        checked={o.isCorrect}
                        onChange={() => handleEditOptionCorrect(i)}
                        className="h-4 w-4"
                      />
                      <span>Mark correct</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {editingQuestion.type === "true_false" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Choose which option is correct.
                </p>
                {editingQuestion.options.map((o, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="edit-correct"
                      checked={o.isCorrect}
                      onChange={() => handleEditOptionCorrect(i)}
                      className="h-4 w-4"
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingQuestion(null)}
              >
                Cancel
              </Button>
              <Button onClick={submitEdit} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUBJECT MODAL */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {editingSubject ? "Edit subject" : "New subject"}
            </h3>
            <Input
              placeholder="Subject name"
              value={subjectForm.name}
              onChange={(e) =>
                setSubjectForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <select
              className="h-10 w-full rounded border px-3"
              value={subjectForm.type}
              onChange={(e) =>
                setSubjectForm((prev) => ({
                  ...prev,
                  type: e.target.value as SubjectType,
                }))
              }
            >
              {SUBJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Optional description"
              value={subjectForm.description}
              onChange={(e) =>
                setSubjectForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeSubjectModal}>
                Cancel
              </Button>
              <Button onClick={submitSubjectForm} disabled={subjectProcessing}>
                {subjectProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : editingSubject ? (
                  "Save"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER MODAL */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {editingChapter ? "Edit chapter" : "New chapter"}
            </h3>
            <Input
              placeholder="Chapter name"
              value={chapterForm.name}
              onChange={(e) =>
                setChapterForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <select
              className="h-10 w-full rounded border px-3"
              value={chapterForm.subject}
              onChange={(e) =>
                setChapterForm((prev) => ({ ...prev, subject: e.target.value }))
              }
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Optional description"
              value={chapterForm.description}
              onChange={(e) =>
                setChapterForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeChapterModal}>
                Cancel
              </Button>
              <Button onClick={submitChapterForm} disabled={chapterProcessing}>
                {chapterProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : editingChapter ? (
                  "Save"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <PageHeader
        title="Questions"
        action={
          viewMode === "questions" ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setNewQuestion({
                    text: "",
                    type: "mcq",
                    subject: selectedSubject || "",
                    chapter: selectedChapter || "",
                    options: [
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false },
                    ],
                    answer: "",
                  });
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openSubjectModal()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Subject
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* HIDDEN FILE INPUT FOR UPLOAD */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const chapterId =
            uploadChapterIdRef.current || selectedChapter || undefined;
          await handleUploadChange(file, chapterId);
          e.target.value = "";
          uploadChapterIdRef.current = null;
        }}
      />

      {/* MAIN CONTENT BASED ON VIEW MODE */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {viewMode === "subjects" && renderSubjectsView()}
          {viewMode === "chapters" && renderChaptersView()}
          {viewMode === "questions" && renderQuestionsView()}
        </>
      )}

      {error && (
        <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
