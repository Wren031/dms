import { useMemo, useState } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

export interface UsePaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  start: number;
  end: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  reset: () => void;
  next: () => void;
  prev: () => void;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  totalItems,
}: UsePaginationOptions): UsePaginationResult {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  return {
    page: safePage,
    pageSize,
    totalPages,
    start,
    end,
    setPage: (p) => setPage(Math.min(Math.max(1, p), totalPages)),
    setPageSize: (s) => {
      setPageSize(s);
      setPage(1);
    },
    reset: () => setPage(1),
    next: () => setPage(p => Math.min(p + 1, totalPages)),
    prev: () => setPage(p => Math.max(p - 1, 1)),
  };
}
