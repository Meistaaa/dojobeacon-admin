import api from "./axiosInstance";

type ApiOptions = {
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
};

export const apiFetch = async <T>(path: string, options: ApiOptions = {}) => {
  const method = options.method || "GET";
  const res = await api.request<T>({
    url: path,
    method,
    data: options.data,
    headers: options.headers,
  });
  return (res.data as any)?.data ?? res.data;
};

export const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};
