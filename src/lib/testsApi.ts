import { buildQuery, apiFetch } from "./api";
import api from "./axiosInstance";
import type {
  MdcatUploadResponse,
  StartTestResponse,
  TestDetail,
  TestSummary,
} from "../types/tests";

type GetMdcatTestsParams = {
  year?: number;
  isPredefined?: boolean;
};

export const getMdcatTests = ({ year, isPredefined }: GetMdcatTestsParams = {}) => {
  const query = buildQuery({
    examType: "mdcat",
    year,
    isPredefined: isPredefined === undefined ? undefined : String(isPredefined),
  });
  return apiFetch<TestSummary[]>(`/tests${query}`);
};

export const getTestById = (id: string) => apiFetch<TestDetail>(`/tests/${id}`);

export const startTest = (id: string) => apiFetch<StartTestResponse>(`/tests/${id}/start`);

// ---- Test question management (admin test editor) ----

export const createTestQuestion = (testId: string, payload: unknown) =>
  apiFetch(`/tests/${testId}/questions`, {
    method: "POST",
    data: payload,
    headers: { "Content-Type": "application/json" },
  });

export const updateQuestion = (questionId: string, payload: unknown) =>
  apiFetch(`/questions/${questionId}`, {
    method: "PUT",
    data: payload,
    headers: { "Content-Type": "application/json" },
  });

export const deleteTestQuestion = (testId: string, questionId: string) =>
  apiFetch(`/tests/${testId}/questions/${questionId}`, { method: "DELETE" });

export const getSubjects = () =>
  apiFetch<Array<{ _id: string; name: string }>>("/subjects");

export const getChapters = () =>
  apiFetch<
    Array<{ _id: string; name: string; subject: { _id: string } | string }>
  >("/chapters");

export const uploadMdcatTest = async (formData: FormData) => {
  const res = await api.post<MdcatUploadResponse>("/tests/upload/mdcat", formData);
  return res.data;
};
