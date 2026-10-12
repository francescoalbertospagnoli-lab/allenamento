import { esc, fmtDate, fmtKg } from "./util.js";

// Grafico a linea minimale in SVG. points: [{ t: ISO date, y: number }]
export function lineChart(points, { unit = "kg", height = 180 } = {}) {
  const pts = points.filter((p) => Number.isFinite(p.y)).sort((a, b) => new Date(a.t) - new Date(b.t));
  if (pts.length < 2) {
    return `<div class="chart-empty">${pts.length ? "Serve almeno un secondo dato per il grafico." : "Ancora nessun dato."}</div>`;
  }
  const W = 340, H = height, L = 40, R = 12, T = 14, B = 26;
  const xs = pts.map((p) => new Date(p.t).getTime());
  const ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) x1 = x0 + 1;
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.05);
  y0 -= pad; y1 += pad;
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (y) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(p.y).toFixed(1)}`).join("");
  const area = `${path}L${X(xs.at(-1)).toFixed(1)},${H - B}L${X(xs[0]).toFixed(1)},${H - B}Z`;
  const ticks = [y0 + pad, (y0 + y1) / 2, y1 - pad];
  const grid = ticks
    .map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end">${fmtKg(Math.round(v * 10) / 10)}</text>`)
    .join("");
  const dots = pts
    .map((p, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i === pts.length - 1 ? 4 : 2.6}"><title>${esc(fmtDate(p.t))}: ${fmtKg(p.y)} ${unit}</title></circle>`)
    .join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico andamento">
    ${grid}
    <path d="${area}" class="a"/><path d="${path}" class="l"/>${dots}
    <text x="${L}" y="${H - 8}">${esc(fmtDate(pts[0].t))}</text>
    <text x="${W - R}" y="${H - 8}" text-anchor="end">${esc(fmtDate(pts.at(-1).t))}</text>
  </svg>`;
}
