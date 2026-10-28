/**
 * Pinjam.in - SVG Icon Dictionary & Renderer
 * 1:1 match with src/components/ui.tsx
 */

export const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  clipboard: 'M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 12l2 2 4-4',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  return: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.6-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  tag: 'M3 12V3h9l9 9-9 9zM8 8h.01',
  sidebar: 'M4 4h16v16H4zM9 4v16',
  cart: 'M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2M10 20.5h.01M17 20.5h.01',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  heart: 'M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  cable: 'M7 3v5M11 3v5M5 8h8v4a4 4 0 0 1-8 0zM9 16v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V5',
  pen: 'M15 4l5 5L9 20H4v-5z',
  board: 'M3 4h18v12H3zM8 20l2-4M16 20l-2-4',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
}

/**
 * Render inline SVG for an icon name.
 * @param {string} name - Icon key name
 * @param {Object} [options]
 * @param {string} [options.className=''] - Additional CSS classes
 * @param {number} [options.size=20] - Width/height in px
 * @param {number} [options.stroke=1.8] - Stroke width
 * @param {boolean} [options.fill=false] - Whether to fill current color
 * @returns {string} Inline SVG string
 */
export function renderIcon(name, { className = '', size = 20, stroke = 1.8, fill = false } = {}) {
  const d = ICONS[name] ?? ICONS.box
  const actualStroke = name === 'more' ? 3 : stroke
  const fillAttr = fill ? 'currentColor' : 'none'
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fillAttr}" stroke="currentColor" stroke-width="${actualStroke}" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true"><path d="${d}" /></svg>`
}

// Make accessible to non-module scripts if needed
if (typeof window !== 'undefined') {
  window.renderIcon = renderIcon
  window.ICONS = ICONS
}
