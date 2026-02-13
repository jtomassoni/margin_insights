import type { SalesRecord } from '../models/SalesRecord';

/**
 * Normalize possible Toast CSV column names to our canonical fields.
 * Handles common Toast export formats.
 */
const COLUMN_ALIASES: Record<string, string> = {
  'item name': 'item_name',
  'itemname': 'item_name',
  'item_name': 'item_name',
  'item': 'item_name',
  'name': 'item_name',
  'menu item': 'item_name',
  'quantity': 'units_sold',
  'units sold': 'units_sold',
  'units_sold': 'units_sold',
  'qty': 'units_sold',
  'revenue': 'revenue',
  'sales': 'revenue',
  'total': 'revenue',
  'amount': 'revenue',
  'netitemamount': 'revenue',
  'net item amount': 'revenue',
  'net amount': 'revenue',
  'netamount': 'revenue',
  'gross amount': 'revenue',
  'gross amount (incl voids)': 'revenue',
  'date': 'timestamp',
  'timestamp': 'timestamp',
  'businessdate': 'timestamp',
  'business date': 'timestamp',
  'order date': 'timestamp',
  'orderdate': 'timestamp',
  'sent date': 'timestamp',
  'opened date': 'timestamp',
  'created at': 'timestamp',
  'net price': 'net_price',
};

const normalizeHeader = (header: string): string => {
  const key = header.trim().toLowerCase().replace(/\s+/g, ' ');
  return COLUMN_ALIASES[key] ?? key.replace(/\s+/g, '_');
};

const parseNumber = (val: string): number => {
  const cleaned = val.replace(/[$,]/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Parse CSV string (with optional BOM) into rows.
 */
const parseCsv = (csvText: string): string[][] => {
  const text = csvText.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === ',' && !inQuotes) || c === '\t') {
        cells.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    cells.push(current.trim());
    return cells;
  });
};

/**
 * Build Toast CSV adapter: parse CSV and return normalized SalesRecord[].
 * Expects at least columns that can be mapped to item_name, units_sold, revenue.
 */
export const parseToastCsv = (csvText: string): { records: SalesRecord[]; errors: string[] } => {
  const errors: string[] = [];
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { records: [], errors: ['CSV must have a header row and at least one data row.'] };
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((h) => normalizeHeader(h));
  const nameIdx = normalizedHeaders.findIndex((h) => h === 'item_name');
  const unitsIdx = normalizedHeaders.findIndex((h) => h === 'units_sold');
  let revenueIdx = normalizedHeaders.findIndex((h) => h === 'revenue');
  const netPriceIdx = normalizedHeaders.findIndex((h) => h === 'net_price');
  const timestampIdx = normalizedHeaders.findIndex((h) => h === 'timestamp');

  if (nameIdx === -1) errors.push('Could not find item name column. Use "Menu Item", "Item Name", or "Item".');
  if (unitsIdx === -1) errors.push('Could not find quantity column. Use "Qty" or "Quantity".');
  if (revenueIdx === -1 && netPriceIdx === -1) {
    errors.push('Could not find revenue column. Use "Net Amount", "Revenue", or "Net Price" (with Qty).');
  }
  if (errors.length > 0) return { records: [], errors };

  const records: SalesRecord[] = dataRows
    .map((row) => {
      const item_name = (row[nameIdx] ?? '').trim();
      const units_sold = parseNumber(row[unitsIdx] ?? '0');
      let revenue =
        revenueIdx >= 0 ? parseNumber(row[revenueIdx] ?? '0') : units_sold * parseNumber(row[netPriceIdx] ?? '0');
      const timestamp = timestampIdx >= 0 && row[timestampIdx] ? row[timestampIdx].trim() : undefined;
      return { item_name, units_sold, revenue, timestamp };
    })
    .filter(({ item_name }) => item_name.length > 0);

  return { records, errors };
};
