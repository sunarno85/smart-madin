import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatGender(gender: string): string {
  return gender === 'MALE' ? 'Laki-laki' : 'Perempuan';
}

export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
    TRANSFERRED: 'Pindah',
    GRADUATED: 'Lulus',
    DROPPED_OUT: 'Keluar',
    RETIRED: 'Pensiun',
    RESIGNED: 'Mengundurkan Diri',
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    TRANSFERRED: 'bg-blue-100 text-blue-800',
    GRADUATED: 'bg-purple-100 text-purple-800',
    DROPPED_OUT: 'bg-red-100 text-red-800',
    RETIRED: 'bg-yellow-100 text-yellow-800',
    RESIGNED: 'bg-orange-100 text-orange-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}
