/**
 * Enum untuk tipe pembayaran acara
 */
export const TipePembayaranAcara = {
  PENYELENGGARA: 'PENYELENGGARA',
  PENONTON: 'PENONTON'
};

/**
 * Biaya default untuk tipe pembayaran
 */
export const BIAYA_PENYELENGGARA = 50000.0;
export const BIAYA_PENONTON = 5000.0;
/**
 * List of supported languages
 * @type {Array<{kodeBahasa: string, namaBahasa: string}>}
 */

export const languages = [
  {
    kodeBahasa: "id",
    namaBahasa: "Bahasa Indonesia"
  },
  {
    kodeBahasa: "jw",
    namaBahasa: "Bahasa Jawa"
  },
  {
    kodeBahasa: "su",
    namaBahasa: "Bahasa Sunda"
  },
];
