import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  initials?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
};

export function Avatar({ name, initials, color = 'bg-brand-600', size = 'md', className }: AvatarProps) {
  const computed = initials ?? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0',
        sizeStyles[size],
        color,
        className
      )}
      aria-label={name}
    >
      {computed}
    </div>
  );
}
