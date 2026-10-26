function elementBounds(elements) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.isDeleted) continue;
    if (el.type === 'arrow') {
      const x2 = el.x + el.points[1][0];
      const y2 = el.y + el.points[1][1];
      minX = Math.min(minX, el.x, x2);
      minY = Math.min(minY, el.y, y2);
      maxX = Math.max(maxX, el.x, x2);
      maxY = Math.max(maxY, el.y, y2);
      continue;
    }
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 0));
    maxY = Math.max(maxY, el.y + (el.height || 0));
  }

  const padding = 32;
  return {
    minX: minX - padding,
    minY: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function arrowHead(x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 10;
  const p1x = x2 - size * Math.cos(angle - Math.PI / 6);
  const p1y = y2 - size * Math.sin(angle - Math.PI / 6);
  const p2x = x2 - size * Math.cos(angle + Math.PI / 6);
  const p2y = y2 - size * Math.sin(angle + Math.PI / 6);
  return `<polygon points="${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>`;
}

function renderExcalidrawToSvg(scene) {
  const { elements, appState } = scene;
  const bounds = elementBounds(elements);
  const bg = appState?.viewBackgroundColor || '#ffffff';

  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(bounds.width)}" height="${Math.ceil(bounds.height)}" viewBox="0 0 ${Math.ceil(bounds.width)} ${Math.ceil(bounds.height)}">`,
    `<rect width="100%" height="100%" fill="${bg}"/>`,
    `<g transform="translate(${-bounds.minX} ${-bounds.minY})">`,
  ];

  for (const el of elements) {
    if (el.isDeleted) continue;

    if (el.type === 'rectangle') {
      const fill =
        el.backgroundColor && el.backgroundColor !== 'transparent'
          ? el.backgroundColor
          : 'none';
      svgParts.push(
        `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" fill="${fill}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}"/>`,
      );
      continue;
    }

    if (el.type === 'arrow') {
      const x2 = el.x + el.points[1][0];
      const y2 = el.y + el.points[1][1];
      svgParts.push(
        `<line x1="${el.x}" y1="${el.y}" x2="${x2}" y2="${y2}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}"/>`,
      );
      svgParts.push(arrowHead(el.x, el.y, x2, y2, el.strokeColor));
      continue;
    }

    if (el.type === 'text') {
      const lines = String(el.text || '').split('\n');
      const lineHeight = (el.lineHeight || 1.25) * (el.fontSize || 16);
      lines.forEach((line, index) => {
        const y = el.y + index * lineHeight + (el.fontSize || 16);
        svgParts.push(
          `<text x="${el.x + (el.width || 0) / 2}" y="${y}" font-family="Arial, sans-serif" font-size="${el.fontSize || 16}" fill="${el.strokeColor || '#1e1e1e'}" text-anchor="middle">${escapeXml(line)}</text>`,
        );
      });
    }
  }

  svgParts.push('</g></svg>');
  return svgParts.join('\n');
}

module.exports = { renderExcalidrawToSvg };
