import logoUrl from '@/assets/logo.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Pass `''` when adjacent text already names the product. */
  alt?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeStyles = {
  sm: 'size-8 rounded-lg',
  md: 'h-11 w-11 rounded-xl',
};

export function Logo({ alt = 'CityDocs DMS', size = 'md', className }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={cn('shrink-0 object-cover', sizeStyles[size], className)}
    />
  );
}
