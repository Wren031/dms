export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(iso: string | Date | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  const dateStr = d.toLocaleDateString('en-US', dateOptions);
  if (!withTime) return dateStr;
  const timeStr = d.toLocaleTimeString('en-US', timeOptions);
  return `${dateStr} ${timeStr}`;
}

export function formatRelative(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hr${hr > 1 ? 's' : ''} ago`;
  if (day < 7) return `${day} day${day > 1 ? 's' : ''} ago`;
  if (day < 30) return `${Math.floor(day / 7)} wk ago`;
  if (day < 365) return `${Math.floor(day / 30)} mo ago`;
  return `${Math.floor(day / 365)} yr ago`;
}

export function truncate(str: string, n: number) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string }>
): string {
  const header = columns.map(c => csvEscape(c.header)).join(',');
  const body = rows
    .map(row => columns.map(c => csvEscape(row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
