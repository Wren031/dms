import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Office } from '@/features/system-admin/offices/types/office';

interface OfficeHierarchyTreeProps {
  offices: Office[];
  rootId?: string | null;
  excludeId?: string;
}

function typeBadgeVariant(type: Office['type']) {
  if (type === 'main') return 'brand' as const;
  if (type === 'division') return 'indigo' as const;
  return 'emerald' as const;
}

function OfficeTreeNode({
  office,
  allOffices,
  depth,
  excludeId,
}: {
  office: Office;
  allOffices: Office[];
  depth: number;
  excludeId?: string;
}) {
  const children = allOffices.filter(
    o => o.parentId === office.id && o.id !== excludeId,
  );

  return (
    <div>
      <div
        className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-mono text-[11px] text-slate-500 shrink-0">{office.code}</span>
        <span className="text-sm font-medium text-slate-900 truncate">{office.name}</span>
        <Badge variant={typeBadgeVariant(office.type)} className="ml-auto">
          {office.type}
        </Badge>
      </div>
      {children.map(child => (
        <OfficeTreeNode
          key={child.id}
          office={child}
          allOffices={allOffices}
          depth={depth + 1}
          excludeId={excludeId}
        />
      ))}
    </div>
  );
}

export function OfficeHierarchyTree({
  offices,
  rootId,
  excludeId,
}: OfficeHierarchyTreeProps) {
  const roots =
    rootId !== undefined
      ? offices.filter(o => o.id === rootId)
      : offices.filter(o => !o.parentId);

  if (roots.length === 0) {
    return (
      <p className="text-sm text-slate-500 px-2 py-4">
        No offices available yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
      {roots.map(root => (
        <OfficeTreeNode
          key={root.id}
          office={root}
          allOffices={offices}
          depth={0}
          excludeId={excludeId}
        />
      ))}
    </div>
  );
}
