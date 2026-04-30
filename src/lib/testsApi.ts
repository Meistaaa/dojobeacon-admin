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

export const uploadMdcatTest = async (formData: FormData) => {
  const res = await api.post<MdcatUploadResponse>("/tests/upload/mdcat", formData);
  return res.data;
};
