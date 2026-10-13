// Spreadsheet-style labels for ranked results: A–Z, then AA–AZ, BA–BZ, … ZZ (and onwards)
export const rankLabel = (index: number): string =>
  index < 26 ? String.fromCharCode(65 + index) : rankLabel(Math.floor(index / 26) - 1) + rankLabel(index % 26)
