import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { cn } from '../lib/utils';

interface AppLogoProps {
  /** Ukuran lebar/tinggi logo dalam pixel. */
  size?: number;
  className?: string;
}

/**
 * Logo aplikasi yang mengikuti logo madrasah pada Profil Madrasah.
 * Query memakai key `school-profile` yang sama dengan halaman profil,
 * sehingga setelah upload logo, komponen ini otomatis diperbarui.
 */
export function AppLogo({ size = 32, className }: AppLogoProps) {
  const [failed, setFailed] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const logo = profile?.logo as string | undefined;
  const src = logo
    ? logo.startsWith('http')
      ? logo
      : `/uploads/${logo}`
    : '';

  // Reset status error bila nama file logo berubah setelah upload ulang.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt="Logo Madrasah"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn('shrink-0 object-contain', className)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground',
        size <= 32 ? 'text-xs' : size <= 48 ? 'text-base' : 'text-xl',
        className,
      )}
    >
      SM
    </div>
  );
}
