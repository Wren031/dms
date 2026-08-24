import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  documentTypeService,
} from '@/features/system-admin/document-type/services/document-type.service';
import type {
  CreateDocumentTypePayload,
  DocumentTypeListFilters,
  DocumentTypeListResponse,
  DocumentTypeRecord,
  UpdateDocumentTypePayload,
} from '@/features/system-admin/document-type/types/document-type';

interface UseDocumentTypesReturn {
  items: DocumentTypeRecord[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;

  refetch: (override?: DocumentTypeListFilters) => Promise<void>;

  fetchById: (id: string) => Promise<DocumentTypeRecord>;
  create: (input: CreateDocumentTypePayload) => Promise<DocumentTypeRecord>;
  update: (id: string, input: UpdateDocumentTypePayload) => Promise<DocumentTypeRecord>;
  remove: (id: string) => Promise<void>;

  creating: boolean;
  updating: boolean;
  deleting: boolean;
  actionError: string | null;
  clearActionError: () => void;
}

function toMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useDocumentTypes(initialFilters: DocumentTypeListFilters = {}): UseDocumentTypesReturn {
  const [filters, setFilters] = useState<DocumentTypeListFilters>(initialFilters);
  const [response, setResponse] = useState<DocumentTypeListResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const clearActionError = useCallback(() => setActionError(null), []);

  const refetch = useCallback(
    async (override?: DocumentTypeListFilters) => {
      setLoading(true);
      setError(null);
      const effective = override ?? filters;
      try {
        const res = await documentTypeService.list(effective);
        setResponse(res);
      } catch (err) {
        setError(toMessage(err, 'Failed to load document types.'));
        setResponse({ items: [], total: 0, page: 1, pageSize: effective.pageSize ?? 20 });
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchById = useCallback(async (id: string) => {
    return documentTypeService.getById(id);
  }, []);

  const create = useCallback(
    async (input: CreateDocumentTypePayload) => {
      setCreating(true);
      setActionError(null);
      try {
        const created = await documentTypeService.create(input);
        await refetch();
        return created;
      } catch (err) {
        setActionError(toMessage(err, 'Failed to create document type.'));
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, input: UpdateDocumentTypePayload) => {
      setUpdating(true);
      setActionError(null);
      try {
        const updated = await documentTypeService.update(id, input);
        await refetch();
        return updated;
      } catch (err) {
        setActionError(toMessage(err, 'Failed to update document type.'));
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      setDeleting(true);
      setActionError(null);
      try {
        await documentTypeService.remove(id);
        await refetch();
      } catch (err) {
        setActionError(toMessage(err, 'Failed to delete document type.'));
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [refetch],
  );

  return {
    items: response.items,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
    loading,
    error,
    refetch: (override?: DocumentTypeListFilters) => {
      if (override) setFilters(override);
      return refetch(override);
    },
    fetchById,
    create,
    update,
    remove,
    creating,
    updating,
    deleting,
    actionError,
    clearActionError,
  };
}
