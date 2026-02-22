export type ExamType = "regular" | "mdcat";

export interface TestSummary {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  totalMarks?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  examType: ExamType;
  year?: number;
  isPredefined?: boolean;
  subjects?: Array<{ _id: string; name: string }>;
  chapters?: Array<{ _id: string; name: string }>;
}

export interface MdcatUploadResponse {
  success: boolean;
  data: {
    testId: string;
    year: number;
    questionsCreated: number;
    questionsSkipped: number;
    skipReasons: Record<string, number>;
  };
}

export interface StartTestResponse {
  test: TestSummary;
  questions: Array<{ _id?: string }>;
  attempt?: {
    _id?: string;
    id?: string;
    status?: string;
    startedAt?: string;
  };
}
