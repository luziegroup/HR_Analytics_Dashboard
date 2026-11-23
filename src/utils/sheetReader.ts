import { MONTHS } from '@/config/team';

const FULL_MONTHS: Record<string, string> = {
  '01': 'januari', '02': 'februari', '03': 'maret', '04': 'april', '05': 'mei', '06': 'juni',
  '07': 'juli', '08': 'agustus', '09': 'september', '10': 'oktober', '11': 'november', '12': 'desember',
};

export function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function extractGid(url: string): string | null {
  const m = url.match(/[#&?]gid=(\d+)/);
  return m ? m[1] : null;
}

/** Sel tunggal atau rentang, contoh D12 atau D12:D12. Hasil huruf besar, atau null bila salah format. */
export function normalizeCell(ref: string): string | null {
  const v = ref.trim().toUpperCase().replace(/\$/g, '');
  return /^[A-Z]{1,3}[1-9][0-9]{0,6}(:[A-Z]{1,3}[1-9][0-9]{0,6})?$/.test(v) ? v : null;
}

/** Tautan yang langsung menuju sel, bila link asli memuat gid tab. */
export function buildCellLink(url: string, cell: string): string {
  const gid = extractGid(url);
  if (!gid) return url;
  const base = url.split('#')[0].replace(/[?&]gid=\d+/, '');
  return `${base}#gid=${gid}&range=${cell}`;
}

/** Ubah teks sel menjadi persen. Teks berakhiran % dibaca apa adanya, angka 0 sampai 2 dibaca sebagai pecahan. */
export function parseScoreText(raw: string): { pct: number; note?: string } | null {
  let t = raw.trim().replace(/\s/g, '');
  if (!t) return null;
  const hasPercent = t.endsWith('%');
  t = t.replace(/%$/, '');
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    t = lastComma > lastDot ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (lastComma > -1) {
    t = t.replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  if (hasPercent) return { pct: n };
  if (n >= 0 && n <= 2) return { pct: Number((n * 100).toFixed(4)), note: 'Dibaca sebagai pecahan (dikali 100).' };
  return { pct: n };
}

export function periodMatches(raw: string, monthKey: string): boolean {
  const t = raw.toLowerCase();
  const [year, mm] = monthKey.split('-');
  const label = MONTHS.find((m) => m.key === monthKey)?.label.toLowerCase();
  const full = FULL_MONTHS[mm];
  return (!!label && t.includes(label)) || (t.includes(full) && t.includes(year));
}

function firstCsvField(csv: string): string {
  const text = csv.replace(/^\uFEFF/, '');
  if (text.startsWith('"')) {
    const m = text.match(/^"((?:[^"]|"")*)"/);
    return m ? m[1].replace(/""/g, '"') : '';
  }
  return text.split(/[,\n\r]/)[0] ?? '';
}

/** Baca satu sel dari Google Sheet yang dibagikan ke "siapa saja yang memiliki link". */
export async function fetchSheetCell(url: string, tab: string, cell: string): Promise<string> {
  const id = extractSheetId(url);
  if (!id) throw new Error('Link harus berupa link Google Sheet (docs.google.com/spreadsheets/...).');
  const first = cell.split(':')[0];
  const endpoint =
    `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0` +
    `&sheet=${encodeURIComponent(tab)}&range=${encodeURIComponent(first)}`;
  let res: Response;
  try {
    res = await fetch(endpoint);
  } catch {
    throw new Error('File tidak bisa dibaca dari sini (jaringan atau pembatasan browser).');
  }
  if (!res.ok) throw new Error(`Gagal membaca file (kode ${res.status}).`);
  const body = await res.text();
  if (body.trimStart().startsWith('<')) {
    throw new Error('File belum bisa dibaca. Atur akses Sheet ke "Siapa saja yang memiliki link: Pelihat".');
  }
  const value = firstCsvField(body.trim());
  if (value === '') throw new Error('Sel kosong atau nama tab/sel salah.');
  return value;
}
