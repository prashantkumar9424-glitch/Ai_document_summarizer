import { getApplicationIdentity } from "./productModelService.js";

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 720;

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value, maxLength = 140) {
  const normalized = String(value || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function buildBaseSvg({ title, subtitle, body, footer = "" }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08111f"/>
      <stop offset="55%" stop-color="#0d1730"/>
      <stop offset="100%" stop-color="#071019"/>
    </linearGradient>
    <linearGradient id="goldCyan" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d6b25e"/>
      <stop offset="100%" stop-color="#62d5d0"/>
    </linearGradient>
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="22" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="36" fill="url(#bg)"/>
  <circle cx="170" cy="130" r="170" fill="#d6b25e" opacity="0.08" filter="url(#softGlow)"/>
  <circle cx="1020" cy="110" r="150" fill="#62d5d0" opacity="0.08" filter="url(#softGlow)"/>
  <circle cx="980" cy="640" r="190" fill="#2dd4bf" opacity="0.06" filter="url(#softGlow)"/>
  <rect x="32" y="28" width="${SVG_WIDTH - 64}" height="${SVG_HEIGHT - 56}" rx="30" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)"/>
  <text x="72" y="88" fill="#d6b25e" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">iNSIGHTS / PROJECT HUB</text>
  <text x="72" y="142" fill="#f5f7fb" font-family="Arial, sans-serif" font-size="42" font-weight="700">${escapeXml(title)}</text>
  <text x="72" y="182" fill="#b4bfd3" font-family="Arial, sans-serif" font-size="20">${escapeXml(subtitle)}</text>
  ${body}
  <text x="72" y="${SVG_HEIGHT - 44}" fill="#72809b" font-family="Arial, sans-serif" font-size="16">${escapeXml(footer)}</text>
</svg>`;
}

export function generateGraphSvg({ title = "Graph", items = [] }) {
  const identity = getApplicationIdentity();
  const safeItems = Array.isArray(items) ? items.filter((item) => item && Number.isFinite(Number(item.value))) : [];
  const total = safeItems.reduce((sum, item) => sum + Number(item.value), 0) || 1;
  const maxBarWidth = 620;
  const barX = 360;
  const startY = 250;
  const gap = 88;

  const rows = safeItems
    .slice(0, 6)
    .map((item, index) => {
      const value = Number(item.value);
      const width = Math.max((value / total) * maxBarWidth, value > 0 ? 18 : 0);
      const y = startY + index * gap;

      return `
      <text x="72" y="${y + 30}" fill="#f5f7fb" font-family="Arial, sans-serif" font-size="24">${escapeXml(truncate(item.label, 26))}</text>
      <rect x="${barX}" y="${y}" width="${maxBarWidth}" height="36" rx="18" fill="rgba(255,255,255,0.08)"/>
      <rect x="${barX}" y="${y}" width="${width}" height="36" rx="18" fill="${escapeXml(item.color || "#62d5d0")}"/>
      <text x="${barX + maxBarWidth + 24}" y="${y + 27}" fill="#d6b25e" font-family="Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(value)}</text>
      `;
    })
    .join("");

  const subtitle = `${identity.execution} graph generated from live analysis data`;
  const footer = `${identity.structure} · ${identity.productThinking} · ${identity.referenceDirection}`;

  return buildBaseSvg({
    title,
    subtitle,
    footer,
    body: rows
  });
}

function buildBulletLines(items, startY, maxItems = 5) {
  return items
    .slice(0, maxItems)
    .map((item, index) => {
      const y = startY + index * 54;

      return `
      <circle cx="86" cy="${y - 8}" r="7" fill="#d6b25e"/>
      <text x="108" y="${y}" fill="#e8edf7" font-family="Arial, sans-serif" font-size="22">${escapeXml(truncate(item, 92))}</text>
      `;
    })
    .join("");
}

export function generateInsightPosterSvg({
  analysis = {},
  title = "Insight Poster"
}) {
  const identity = getApplicationIdentity();
  const keyInsights = Array.isArray(analysis.keyInsights) ? analysis.keyInsights : [];
  const tasks = Array.isArray(analysis.normalizedTasks) ? analysis.normalizedTasks : [];
  const topTasks = tasks
    .slice(0, 3)
    .map((task) => `${task.task}${task.priority ? ` (${task.priority})` : ""}`);

  const summaryText = truncate(analysis.summary || "No summary available.", 260);
  const body = `
    <rect x="72" y="226" width="510" height="386" rx="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
    <text x="102" y="272" fill="#d6b25e" font-family="Arial, sans-serif" font-size="18" letter-spacing="2.5">KEY INSIGHTS</text>
    ${buildBulletLines(keyInsights, 326)}

    <rect x="620" y="226" width="508" height="178" rx="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
    <text x="650" y="272" fill="#d6b25e" font-family="Arial, sans-serif" font-size="18" letter-spacing="2.5">EXECUTION SNAPSHOT</text>
    <text x="650" y="316" fill="#f5f7fb" font-family="Arial, sans-serif" font-size="24">${escapeXml(summaryText)}</text>

    <rect x="620" y="434" width="508" height="178" rx="26" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
    <text x="650" y="480" fill="#d6b25e" font-family="Arial, sans-serif" font-size="18" letter-spacing="2.5">TOP ACTIONS</text>
    ${buildBulletLines(topTasks.length > 0 ? topTasks : ["No tasks available yet"], 532, 3)}
  `;

  return buildBaseSvg({
    title,
    subtitle: `${identity.brand} poster generated for ${identity.execution}`,
    footer: `${identity.continuation} · ${identity.productThinking} · ${identity.referenceDirection}`,
    body
  });
}

export function buildSvgAssetResponse({ svg, filename }) {
  return {
    filename,
    mimeType: "image/svg+xml",
    svg
  };
}
