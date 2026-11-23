// Quote a value so commas and quotes do not break the CSV
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Build the CSV text from a header list and rows of plain values, then download it
export function downloadCsv(filename, head, rows) {
  const lines = [head, ...rows].map((row) => row.map(csvCell).join(","));
  // The BOM makes Excel read the file as UTF-8
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
