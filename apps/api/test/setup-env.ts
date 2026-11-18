/**
 * Pastikan environment development (dan .env root) terbaca sebelum
 * modul aplikasi diimpor oleh Jest.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
