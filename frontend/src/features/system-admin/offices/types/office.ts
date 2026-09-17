export type OfficeType = 'main' | 'division' | 'unit';

export interface Office {
  id: string;
  name: string;
  code: string;
  type: OfficeType;
  headName: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { employees: number };
}

export interface OfficeListResponse {
  items: Office[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOfficeInput {
  name: string;
  code: string;
  type: OfficeType;
  headName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateOfficeInput = Partial<CreateOfficeInput>;

export interface OfficeListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: OfficeType | 'all';
  isActive?: boolean;
  order?: 'asc' | 'desc';
}

export const OFFICE_TYPE_OPTIONS: { value: OfficeType; label: string }[] = [
  { value: 'main', label: 'Main Office' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
];
