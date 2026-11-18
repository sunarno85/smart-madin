import { useAuth } from '../contexts/AuthContext';

/**
 * Menampilkan children hanya bila pengguna memiliki permission yang diminta.
 * API tetap menjadi sumber kebenaran; ini menjaga tombol aksi tidak
 * muncul untuk peran yang hanya memiliki akses baca.
 */
export function Can({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : null;
}

export function useCan(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
