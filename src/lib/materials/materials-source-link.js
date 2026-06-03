/** @param {{ filingUrl?: string | null, fetched?: { sourceUrl?: string | null, publicUrl?: string | null } | null } | null | undefined} row */
export function effectiveSourceUrl(row) {
  if (!row) return null;
  return row.filingUrl ?? row.fetched?.publicUrl ?? row.fetched?.sourceUrl ?? null;
}
