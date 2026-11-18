import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const UPLOAD_BASE = api.defaults.baseURL?.replace('/api', '') || '';

interface PrintHeaderProps {
  /** Document title, e.g. "Jadwal Pelajaran Mingguan", "Laporan Santri" */
  title: string;
  /** Optional subtitle/details line below title */
  subtitle?: string;
}

/**
 * Professional letterhead for print output.
 * Design: double gold lines top+bottom, centered logo, school name in navy,
 * address/contact in gray, document title in bold, decorative divider.
 */
export function PrintHeader({ title, subtitle }: PrintHeaderProps) {
  const { data: profile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const logoUrl = profile?.logo ? `${UPLOAD_BASE}/uploads/${profile.logo}` : '';
  const name = profile?.name || 'Madrasah Diniyah';
  const addressParts = [profile?.address, profile?.village, profile?.district, profile?.regency, profile?.province]
    .filter(Boolean);
  const addressLine = addressParts.join(', ');
  const contactLine = [
    profile?.phone ? `Telp: ${profile.phone}` : '',
    profile?.email ? `Email: ${profile.email}` : '',
  ].filter(Boolean).join(' | ');

  return (
    <div className="hidden print:block mb-4">
      {/* ── Logo + School Identity ── */}
      <div className="flex items-center justify-center gap-4 my-3">
        {logoUrl && (
          <div className="flex-shrink-0">
            <img
              src={logoUrl}
              alt="Logo Madrasah"
              className="object-contain"
              style={{ width: 72, height: 72 }}
            />
          </div>
        )}
        <div className="text-center">
          <h1
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: '16px', color: '#154360', letterSpacing: '0.15em', lineHeight: 1.2 }}
          >
            {name}
          </h1>
          {addressLine && (
            <p className="mt-0.5" style={{ fontSize: '10px', color: '#555', lineHeight: 1.3 }}>
              {addressLine}
            </p>
          )}
          {contactLine && (
            <p style={{ fontSize: '9px', color: '#777', lineHeight: 1.3 }}>
              {contactLine}
            </p>
          )}
        </div>
      </div>

      {/* ── Decorative divider ── */}
      <div className="flex items-center justify-center gap-2 my-1">
        <div className="flex-1" style={{ borderTop: '1px solid #ccc' }} />
        <span style={{ fontSize: '10px', color: '#f4d03f' }}>✦</span>
        <span style={{ fontSize: '8px', color: '#154360' }}>✦</span>
        <span style={{ fontSize: '10px', color: '#f4d03f' }}>✦</span>
        <div className="flex-1" style={{ borderTop: '1px solid #ccc' }} />
      </div>

      {/* ── Document Title ── */}
      <h2
        className="text-center font-bold uppercase mt-1 mb-0.5"
        style={{ fontSize: '13px', color: '#154360', letterSpacing: '0.08em' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-center" style={{ fontSize: '10px', color: '#666' }}>
          {subtitle}
        </p>
      )}


    </div>
  );
}

interface PrintFooterProps {
  /** Optional extra info before school name */
  extra?: string;
}

/**
 * Professional print footer with decorative lines and print timestamp.
 */
export function PrintFooter({ extra }: PrintFooterProps) {
  const { data: profile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/school/profile').then((r) => r.data),
  });

  const name = profile?.name || '';
  const now = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="hidden print:block mt-6 pt-2">
      <div className="flex justify-between items-center" style={{ fontSize: '9px', color: '#777' }}>
        <span>Dicetak pada {now}{extra ? ` — ${extra}` : ''}</span>
        <span className="font-semibold" style={{ color: '#555' }}>{name}</span>
      </div>
    </div>
  );
}
