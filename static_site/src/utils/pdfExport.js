import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { palette } from '../styles/palette';
import { parseReport } from './reportSummary';

const PAGE = { width: 612, height: 792, margin: 54 };
const CONTENT_TOP = 78;
const CONTENT_BOTTOM = PAGE.height - 66;
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const BODY = { size: 10, leading: 15 };
const COVER_BAND_MIN = 240;

const { neutral, brand, ember } = palette;

// Helvetica in jsPDF only covers WinAnsi; map common symbols and drop the rest (emoji etc.).
const WIN_ANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const REPLACEMENTS = { '→': '->', '←': '<-', '−': '-', '≈': '~', '≤': '<=', '≥': '>=', '✓': 'v', '✔': 'v', ' ': ' ' };

export const sanitizePdfText = (text) =>
    Array.from(String(text ?? ''))
        .map((char) => REPLACEMENTS[char] ?? char)
        .filter((char) => char.length > 1 || char.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRAS.has(char))
        .join('')
        .replace(/[ \t]+/g, ' ');

const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a, b, t) => {
    const [ra, ga, ba] = hexToRgb(a);
    const [rb, gb, bb] = hexToRgb(b);
    return [ra + (rb - ra) * t, ga + (gb - ga) * t, ba + (bb - ba) * t].map(Math.round);
};

const plainText = (node) => {
    if (!node) return '';
    if (node.type === 'text' || node.type === 'inlineCode') return node.value;
    if (node.type === 'break') return ' ';
    return (node.children ?? []).map(plainText).join('');
};

const FONT_STYLE = { normal: 'normal', strong: 'bold', emphasis: 'italic', strongEmphasis: 'bolditalic' };

const collectRuns = (nodes, marks = {}, runs = []) => {
    for (const node of nodes ?? []) {
        if (node.type === 'text') runs.push({ text: node.value, ...marks });
        else if (node.type === 'inlineCode') runs.push({ text: node.value, ...marks, code: true });
        else if (node.type === 'break') runs.push({ text: ' ', ...marks });
        else if (node.type === 'strong') collectRuns(node.children, { ...marks, strong: true }, runs);
        else if (node.type === 'emphasis') collectRuns(node.children, { ...marks, emphasis: true }, runs);
        else if (node.type === 'link') collectRuns(node.children, { ...marks, url: node.url }, runs);
        else if (node.children) collectRuns(node.children, marks, runs);
    }
    return runs;
};

const fontFor = (run) => {
    if (run.code) return ['courier', 'normal'];
    const key = run.strong && run.emphasis ? 'strongEmphasis' : run.strong ? 'strong' : run.emphasis ? 'emphasis' : 'normal';
    return ['helvetica', FONT_STYLE[key]];
};

class PdfWriter {
    constructor(doc, autoTable, report, generatedAt) {
        this.doc = doc;
        this.autoTable = autoTable;
        this.report = report;
        this.generatedLabel = generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        this.y = CONTENT_TOP;
        this.tocEntries = [];
    }

    setColor(hex) {
        this.doc.setTextColor(...hexToRgb(hex));
    }

    measure(run, size) {
        const [family, style] = fontFor(run);
        this.doc.setFont(family, style);
        this.doc.setFontSize(size);
        return this.doc.getTextWidth(run.text) * (run.code ? 0.92 : 1);
    }

    layoutRuns(runs, width, size) {
        this.doc.setFontSize(size);
        const lines = [[]];
        let lineWidth = 0;
        const pieces = runs.flatMap((run) =>
            sanitizePdfText(run.text)
                .split(/(\s+)/)
                .filter(Boolean)
                .map((text) => ({ ...run, text }))
        );
        for (const piece of pieces) {
            const isSpace = /^\s+$/.test(piece.text);
            if (isSpace && lineWidth === 0) continue;
            const pieceWidth = this.measure(piece, size);
            if (!isSpace && lineWidth + pieceWidth > width && lineWidth > 0) {
                const last = lines[lines.length - 1];
                while (last.length && /^\s+$/.test(last[last.length - 1].text)) last.pop();
                lines.push([]);
                lineWidth = 0;
            }
            lines[lines.length - 1].push({ ...piece, width: pieceWidth });
            lineWidth += pieceWidth;
        }
        return lines.filter((line) => line.length);
    }

    drawLine(line, x, baseline, size, color) {
        let cursor = x;
        const segments = [];
        for (const piece of line) {
            const last = segments[segments.length - 1];
            if (last && last.code === piece.code && last.url === piece.url && fontFor(last).join() === fontFor(piece).join()) {
                last.text += piece.text;
            } else {
                segments.push({ ...piece });
            }
        }
        for (const piece of segments) {
            piece.width = this.measure(piece, size);
            const [family, style] = fontFor(piece);
            this.doc.setFont(family, style);
            this.doc.setFontSize(piece.code ? size * 0.92 : size);
            if (piece.code) {
                this.doc.setFillColor(...hexToRgb(neutral[50]));
                this.doc.rect(cursor - 1, baseline - size * 0.8, piece.width + 2, size * 1.05, 'F');
            }
            this.setColor(piece.url ? brand[600] : piece.code ? neutral[800] : color);
            this.doc.text(piece.text, cursor, baseline);
            if (piece.url) this.doc.link(cursor, baseline - size, piece.width, size * 1.2, { url: piece.url });
            cursor += piece.width;
        }
    }

    ensureSpace(height) {
        if (this.y + height > CONTENT_BOTTOM) this.newPage();
    }

    newPage() {
        this.doc.addPage('letter', 'portrait');
        this.y = CONTENT_TOP;
    }

    paragraph(runs, { x = PAGE.margin, width = CONTENT_WIDTH, size = BODY.size, leading = BODY.leading, color = neutral[700], after = 8, onLine } = {}) {
        const lines = this.layoutRuns(runs, width, size);
        lines.forEach((line, index) => {
            this.ensureSpace(leading);
            onLine?.(index, this.y);
            this.drawLine(line, x, this.y + size, size, color);
            this.y += leading;
        });
        this.y += after;
    }

    heading(node) {
        const text = sanitizePdfText(plainText(node));
        if (node.depth <= 2) {
            this.ensureSpace(90);
            if (this.y > CONTENT_TOP) this.y += 14;
            this.tocEntries.push({ title: text, page: this.doc.getCurrentPageInfo().pageNumber });
            this.doc.setFont('helvetica', 'bold');
            this.doc.setFontSize(15);
            this.setColor(brand[700]);
            this.doc.text(text, PAGE.margin, this.y + 15);
            this.y += 24;
            this.doc.setDrawColor(...hexToRgb(neutral[200]));
            this.doc.setLineWidth(0.75);
            this.doc.line(PAGE.margin, this.y, PAGE.margin + CONTENT_WIDTH, this.y);
            this.y += 12;
        } else {
            this.ensureSpace(60);
            this.y += 6;
            this.paragraph([{ text, strong: true }], { size: 11.5, leading: 16, color: neutral[900], after: 4 });
        }
    }

    list(node, depth = 0) {
        const indent = PAGE.margin + depth * 16;
        node.children.forEach((item, index) => {
            const [first, ...rest] = item.children;
            const runs = first?.type === 'paragraph' ? collectRuns(first.children) : [];
            this.paragraph(runs, {
                x: indent + 14,
                width: CONTENT_WIDTH - (indent - PAGE.margin) - 14,
                after: 3,
                onLine: (lineIndex, top) => {
                    if (lineIndex) return;
                    if (node.ordered) {
                        this.doc.setFont('helvetica', 'bold');
                        this.doc.setFontSize(BODY.size);
                        this.setColor(brand[600]);
                        this.doc.text(`${(node.start ?? 1) + index}.`, indent, top + BODY.size);
                    } else {
                        this.doc.setFillColor(...hexToRgb(depth ? neutral[400] : brand[500]));
                        this.doc.circle(indent + 4, top + BODY.size * 0.62, depth ? 1.4 : 1.8, 'F');
                    }
                },
            });
            for (const child of first?.type === 'paragraph' ? rest : item.children) {
                if (child.type === 'list') this.list(child, depth + 1);
                else this.block(child);
            }
        });
        if (depth === 0) this.y += 6;
    }

    table(node) {
        const [head, ...rows] = node.children.map((row) => row.children.map((cell) => sanitizePdfText(plainText(cell))));
        const align = node.align ?? [];
        const columnStyles = Object.fromEntries(align.map((value, i) => [i, { halign: value ?? 'left' }]));
        this.ensureSpace(48);
        this.autoTable(this.doc, {
            startY: this.y,
            head: [head],
            body: rows,
            margin: { top: CONTENT_TOP, bottom: PAGE.height - CONTENT_BOTTOM, left: PAGE.margin, right: PAGE.margin },
            theme: 'plain',
            rowPageBreak: 'avoid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
                textColor: hexToRgb(neutral[700]),
                lineColor: hexToRgb(neutral[200]),
                lineWidth: { bottom: 0.5 },
            },
            headStyles: { fillColor: hexToRgb(neutral[50]), textColor: hexToRgb(neutral[600]), fontStyle: 'bold', fontSize: 8 },
            columnStyles,
            didParseCell: (data) => {
                if (data.section === 'head') data.cell.styles.halign = align[data.column.index] ?? 'left';
            },
        });
        this.y = this.doc.lastAutoTable.finalY + 14;
    }

    blockquote(node) {
        const runs = node.children.flatMap((child) => [...collectRuns(child.children ?? [child]), { text: ' ' }]);
        const lines = this.layoutRuns(runs, CONTENT_WIDTH - 24, BODY.size);
        this.y += 2;
        lines.forEach((line, index) => {
            this.ensureSpace(BODY.leading);
            const top = this.y - (index === 0 ? 6 : 0);
            const height = BODY.leading + (index === 0 ? 6 : 0) + (index === lines.length - 1 ? 6 : 0);
            this.doc.setFillColor(...hexToRgb(brand[50]));
            this.doc.rect(PAGE.margin, top, CONTENT_WIDTH, height, 'F');
            this.doc.setFillColor(...hexToRgb(brand[500]));
            this.doc.rect(PAGE.margin, top, 2.5, height, 'F');
            this.drawLine(line, PAGE.margin + 14, this.y + BODY.size, BODY.size, neutral[800]);
            this.y += BODY.leading;
        });
        this.y += 14;
    }

    code(node) {
        const size = 8.5;
        const leading = 12;
        this.y += 2;
        for (const raw of sanitizePdfText(node.value).split('\n')) {
            const lines = this.doc.setFont('courier', 'normal').setFontSize(size).splitTextToSize(raw || ' ', CONTENT_WIDTH - 20);
            for (const line of lines) {
                this.ensureSpace(leading);
                this.doc.setFillColor(...hexToRgb(neutral[50]));
                this.doc.rect(PAGE.margin, this.y, CONTENT_WIDTH, leading, 'F');
                this.setColor(neutral[800]);
                this.doc.text(line, PAGE.margin + 10, this.y + size + 1);
                this.y += leading;
            }
        }
        this.y += 12;
    }

    block(node) {
        switch (node.type) {
            case 'heading':
                return this.heading(node);
            case 'paragraph':
                return this.paragraph(collectRuns(node.children));
            case 'list':
                return this.list(node);
            case 'table':
                return this.table(node);
            case 'blockquote':
                return this.blockquote(node);
            case 'code':
                return this.code(node);
            case 'thematicBreak':
                this.ensureSpace(20);
                this.doc.setDrawColor(...hexToRgb(neutral[200]));
                this.doc.line(PAGE.margin, this.y + 8, PAGE.margin + CONTENT_WIDTH, this.y + 8);
                this.y += 20;
                return undefined;
            default:
                return undefined;
        }
    }

    cover() {
        const { doc, report } = this;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        const titleLines = doc.splitTextToSize(sanitizePdfText(report.sprintName), CONTENT_WIDTH).slice(0, 3);
        const subtitleY = 140 + (titleLines.length - 1) * 32 + 34;
        const bandHeight = Math.max(COVER_BAND_MIN, subtitleY + 64);

        const slices = 120;
        for (let i = 0; i < slices; i++) {
            doc.setFillColor(...mix(brand[800], brand[500], i / (slices - 1)));
            doc.rect((PAGE.width / slices) * i, 0, PAGE.width / slices + 0.5, bandHeight, 'F');
        }
        doc.setFillColor(...hexToRgb(ember[500]));
        doc.circle(PAGE.margin + 3, 92, 3, 'F');

        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('SPRINT INTELLIGENCE REPORT', PAGE.margin + 12, 95, { charSpace: 1.2 });
        doc.setFontSize(28);
        doc.text(titleLines, PAGE.margin, 140, { lineHeightFactor: 1.15 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...hexToRgb(brand[100]));
        const subtitle = [report.period, `Generated ${this.generatedLabel}`].filter(Boolean).map(sanitizePdfText).join('   \u00B7   ');
        doc.text(subtitle, PAGE.margin, subtitleY);

        const columns = 3;
        const gap = 12;
        const tileWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
        const tileHeight = 64;
        report.kpis.slice(0, 6).forEach((kpi, index) => {
            const x = PAGE.margin + (index % columns) * (tileWidth + gap);
            const y = bandHeight + 32 + Math.floor(index / columns) * (tileHeight + gap);
            doc.setFillColor(...hexToRgb(neutral[50]));
            doc.roundedRect(x, y, tileWidth, tileHeight, 8, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            this.setColor(neutral[500]);
            doc.text(sanitizePdfText(kpi.label).toUpperCase(), x + 14, y + 22, { charSpace: 0.6 });
            doc.setFontSize(18);
            this.setColor(neutral[900]);
            doc.text(doc.splitTextToSize(sanitizePdfText(kpi.value), tileWidth - 28)[0], x + 14, y + 46);
        });
        this.tocTop = bandHeight + 32 + Math.ceil(Math.min(report.kpis.length, 6) / columns) * (tileHeight + gap) + 24;
        this.coverFooter();
    }

    coverToc() {
        const { doc } = this;
        if (!this.tocEntries.length) return;
        doc.setPage(1);
        let y = this.tocTop;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        this.setColor(neutral[500]);
        doc.text('IN THIS REPORT', PAGE.margin, y, { charSpace: 0.8 });
        y += 18;
        doc.setFontSize(10);
        for (const entry of this.tocEntries) {
            if (y > PAGE.height - 90) break;
            doc.setFont('helvetica', 'normal');
            this.setColor(neutral[800]);
            doc.text(entry.title, PAGE.margin, y);
            this.setColor(neutral[500]);
            doc.text(String(entry.page), PAGE.margin + CONTENT_WIDTH, y, { align: 'right' });
            doc.setDrawColor(...hexToRgb(neutral[100]));
            doc.setLineWidth(0.5);
            doc.line(PAGE.margin, y + 6, PAGE.margin + CONTENT_WIDTH, y + 6);
            y += 20;
        }
    }

    coverFooter() {
        const { doc } = this;
        doc.setFillColor(...hexToRgb(ember[500]));
        doc.circle(PAGE.margin + 2.5, PAGE.height - 39, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        this.setColor(neutral[700]);
        doc.text('Arc Agent', PAGE.margin + 10, PAGE.height - 36);
        const offset = doc.getTextWidth('Arc Agent') + 6;
        doc.setFont('helvetica', 'normal');
        this.setColor(neutral[500]);
        doc.text('\u00B7  BSC Analytics', PAGE.margin + 10 + offset, PAGE.height - 36);
    }

    chrome() {
        const { doc } = this;
        const total = doc.getNumberOfPages();
        for (let page = 2; page <= total; page++) {
            doc.setPage(page);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            this.setColor(neutral[500]);
            const header = sanitizePdfText(`Sprint Intelligence Report  \u00B7  ${this.report.sprintName}`);
            doc.text(doc.splitTextToSize(header, CONTENT_WIDTH - 120)[0], PAGE.margin, 40);
            doc.text(this.generatedLabel, PAGE.width - PAGE.margin, 40, { align: 'right' });
            doc.setDrawColor(...hexToRgb(neutral[200]));
            doc.setLineWidth(0.5);
            doc.line(PAGE.margin, 50, PAGE.width - PAGE.margin, 50);
            doc.line(PAGE.margin, PAGE.height - 50, PAGE.width - PAGE.margin, PAGE.height - 50);
            doc.text('Arc Agent  \u00B7  BSC Analytics', PAGE.margin, PAGE.height - 34);
            doc.text(`Page ${page} of ${total}`, PAGE.width - PAGE.margin, PAGE.height - 34, { align: 'right' });
        }
    }
}

const parseMarkdown = (text) => unified().use(remarkParse).use(remarkGfm).parse(text);

export const buildReportPdf = async (markdown, { generatedAt = new Date() } = {}) => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const report = parseReport(markdown);
    const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    doc.setProperties({ title: `Sprint Intelligence Report: ${report.sprintName}`, creator: 'Arc Agent', author: 'BSC Analytics' });

    const writer = new PdfWriter(doc, autoTable, report, generatedAt);
    writer.cover();
    writer.newPage();
    for (const node of parseMarkdown(report.body).children) writer.block(node);
    writer.coverToc();
    writer.chrome();
    return doc;
};

export const reportFileName = (sprintName, date = new Date()) => {
    const slug = sprintName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sprint';
    return `sprint-report-${slug}-${date.toISOString().split('T')[0]}.pdf`;
};

export const downloadPDF = async (markdown) => {
    const doc = await buildReportPdf(markdown);
    doc.save(reportFileName(parseReport(markdown).sprintName));
};
