export type PaginationState = {
  page: number;
  pageSize: number;
};

export const paginate = <T>(items: T[], { page, pageSize }: PaginationState) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
};

export const buildPagination = (total: number, { page, pageSize }: PaginationState) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    pageCount,
    total,
  };
};
