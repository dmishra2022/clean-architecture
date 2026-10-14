// Tiny SVG toolkit used by build-diagrams.mjs. No dependencies.

export const C = {
  navy: '#1F3A5F',
  navyDark: '#152B47',
  teal: '#2A9D8F',
  tealLight: '#E3F4F1',
  amber: '#E9A23B',
  amberLight: '#FDF1DC',
  slate: '#5B6B7F',
  ink: '#1D2733',
  paper: '#FFFFFF',
  mist: '#EEF2F6',
  line: '#C9D3DE',
  red: '#C8553D',
  redLight: '#FBE9E5',
  green: '#3C9D5D',
  greenLight: '#E5F4EA',
  purple: '#6D5BD0',
  purpleLight: '#ECE9FB',
  // event-storming sticky colours
  stickyEvent: '#F4A261',
  stickyCommand: '#7EC8E3',
  stickyAggregate: '#FFE066',
  stickyPolicy: '#C3AED6',
  stickyReadModel: '#9BE7A0',
  stickyExternal: '#F7A1C4',
  stickyHotspot: '#E76F6F',
  stickyActor: '#FFF3B0',
};

const FONT = "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function svg(width, height, title, body) {
  const markers = Object.entries({ navy: C.navy, teal: C.teal, red: C.red, slate: C.slate, amber: C.amber, green: C.green, purple: C.purple, ink: C.ink })
    .map(([name, color]) => `
    <marker id="arrow-${name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
      <path d="M0,0 L10,5 L0,10 z" fill="${color}"/>
    </marker>
    <marker id="hollow-${name}" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M1,1 L11,6 L1,11 z" fill="#fff" stroke="${color}" stroke-width="1.5"/>
    </marker>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <defs>${markers}
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1D2733" flood-opacity="0.14"/>
    </filter>
  </defs>
  <style>
    text { font-family: ${FONT}; white-space: pre; }
    .mono { font-family: ${MONO}; }
  </style>
  <rect width="100%" height="100%" fill="${C.paper}"/>
${body}
</svg>
`;
}

export function rect(x, y, w, h, { fill = C.mist, stroke = 'none', sw = 1.5, rx = 10, dash = null, shadow = false, opacity = 1 } = {}) {
  return `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${shadow ? ' filter="url(#shadow)"' : ''}${opacity !== 1 ? ` opacity="${opacity}"` : ''}/>\n`;
}

/** Multi-line text; lines split on \n. y is the baseline of the first line. */
export function text(x, y, str, { size = 14, weight = 400, fill = C.ink, anchor = 'start', mono = false, lineHeight = 1.3, italic = false, opacity = 1 } = {}) {
  const lines = String(str).split('\n');
  const tspans = lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * lineHeight}">${esc(line)}</tspan>`).join('');
  return `  <text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${mono ? ' class="mono"' : ''}${italic ? ' font-style="italic"' : ''}${opacity !== 1 ? ` opacity="${opacity}"` : ''}>${tspans}</text>\n`;
}

/** Rounded box with a bold title and optional body lines, vertically centred. */
export function box(x, y, w, h, title, lines = [], {
  fill = C.navy, color = '#fff', stroke = 'none', sw = 1.5, titleSize = 15, lineSize = 12.5, mono = false, rx = 10, shadow = true, dash = null, align = 'middle', sub = null,
} = {}) {
  const body = Array.isArray(lines) ? lines : [lines];
  const titleLines = String(title).split('\n');
  const total = titleLines.length * titleSize * 1.25 + body.length * lineSize * 1.4 + (sub ? lineSize * 1.4 : 0);
  let cursor = y + h / 2 - total / 2 + titleSize * 0.95;
  const tx = align === 'middle' ? x + w / 2 : x + 14;
  let out = rect(x, y, w, h, { fill, stroke, sw, rx, shadow, dash });
  out += text(tx, cursor, title, { size: titleSize, weight: 700, fill: color, anchor: align === 'middle' ? 'middle' : 'start', lineHeight: 1.25 });
  cursor += (titleLines.length - 1) * titleSize * 1.25;
  if (sub) {
    cursor += lineSize * 1.4;
    out += text(tx, cursor, sub, { size: lineSize, weight: 600, fill: color, anchor: align === 'middle' ? 'middle' : 'start', italic: true, opacity: 0.9 });
  }
  for (const line of body) {
    cursor += lineSize * 1.4;
    out += text(tx, cursor, line, { size: lineSize, fill: color, anchor: align === 'middle' ? 'middle' : 'start', mono, opacity: 0.95 });
  }
  return out;
}

export function line(x1, y1, x2, y2, { color = 'slate', sw = 2, dash = null, head = 'end', hollow = false } = {}) {
  const stroke = C[color] ?? color;
  const marker = hollow ? `url(#hollow-${color})` : `url(#arrow-${color})`;
  const start = head === 'both' ? ` marker-start="${marker}"` : '';
  const end = head === 'end' || head === 'both' ? ` marker-end="${marker}"` : '';
  return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${start}${end}/>\n`;
}

export function path(d, { color = 'slate', sw = 2, dash = null, head = 'end', fill = 'none', hollow = false } = {}) {
  const stroke = C[color] ?? color;
  const marker = hollow ? `url(#hollow-${color})` : `url(#arrow-${color})`;
  const end = head === 'end' || head === 'both' ? ` marker-end="${marker}"` : '';
  const start = head === 'both' ? ` marker-start="${marker}"` : '';
  return `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${start}${end}/>\n`;
}

/** Small label with a white background so it stays readable on top of lines. */
export function label(x, y, str, { size = 12, fill = C.ink, bg = '#fff', weight = 600, border = C.line, padX = 7 } = {}) {
  const w = Math.round(String(str).length * size * 0.58 + padX * 2);
  const h = Math.round(size * 1.7);
  return rect(x - w / 2, y - h / 2, w, h, { fill: bg, stroke: border, sw: 1, rx: h / 2, shadow: false })
    + text(x, y + size * 0.36, str, { size, fill, anchor: 'middle', weight });
}

export function pill(x, y, w, h, str, { fill = C.paper, stroke = C.teal, color = C.ink, size = 12.5, mono = true, weight = 600 } = {}) {
  return rect(x, y, w, h, { fill, stroke, sw: 1.8, rx: h / 2, shadow: false })
    + text(x + w / 2, y + h / 2 + size * 0.36, str, { size, fill: color, anchor: 'middle', mono, weight });
}

/** Flat-topped hexagon. */
export function hexagonPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function hexagon(cx, cy, r, { fill = C.tealLight, stroke = C.teal, sw = 2.5, dash = null, shadow = false } = {}) {
  return `  <polygon points="${hexagonPoints(cx, cy, r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${shadow ? ' filter="url(#shadow)"' : ''}/>\n`;
}

export function sticky(x, y, w, h, str, color, { size = 13, rotate = 0 } = {}) {
  const t = rotate ? ` transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})"` : '';
  const lines = String(str).split('\n');
  const startY = y + h / 2 - ((lines.length - 1) * size * 1.25) / 2 + size * 0.36;
  return `  <g${t}>\n`
    + `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" filter="url(#shadow)"/>\n`
    + text(x + w / 2, startY, str, { size, anchor: 'middle', weight: 600, lineHeight: 1.25 })
    + '  </g>\n';
}

export function cylinder(x, y, w, h, title, lines = [], { fill = C.slate, color = '#fff' } = {}) {
  const ry = 12;
  let out = `  <path d="M${x},${y + ry} a${w / 2},${ry} 0 0,0 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0,1 ${-w},0 z" fill="${fill}" filter="url(#shadow)"/>\n`;
  out += `  <ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="${fill}" stroke="#fff" stroke-opacity="0.5"/>\n`;
  out += text(x + w / 2, y + ry * 2 + 22, title, { size: 15, weight: 700, fill: color, anchor: 'middle' });
  lines.forEach((l, i) => { out += text(x + w / 2, y + ry * 2 + 44 + i * 18, l, { size: 12, fill: color, anchor: 'middle', mono: true }); });
  return out;
}

export function heading(width, title, subtitle) {
  return text(40, 48, title, { size: 26, weight: 800, fill: C.navy })
    + (subtitle ? text(40, 76, subtitle, { size: 15, fill: C.slate }) : '')
    + line(40, 92, width - 40, 92, { color: C.line, sw: 1, head: 'none' });
}

export function legend(x, y, items, { size = 12.5, gap = 24, swatch = 16 } = {}) {
  let out = '';
  items.forEach(([color, name, kind = 'box'], i) => {
    const yy = y + i * gap;
    if (kind === 'line') out += line(x, yy, x + 30, yy, { color, sw: 2.2 });
    else if (kind === 'dash') out += line(x, yy, x + 30, yy, { color, sw: 2.2, dash: '6 4', hollow: true });
    else out += rect(x, yy - swatch / 2, swatch, swatch, { fill: C[color] ?? color, rx: 3 });
    out += text(x + (kind === 'box' ? swatch + 10 : 40), yy + size * 0.36, name, { size, fill: C.ink });
  });
  return out;
}
