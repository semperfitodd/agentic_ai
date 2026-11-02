const H1 = /^#\s+(.+?)\s*#*\s*$/;
const H2 = /^##\s+(.+?)\s*#*\s*$/;
const GLANCE_TITLE = /^at a glance$/i;
const BULLET_FACT = /^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*(.+)$/;
const BOLD_FACT = /^\s*\*\*(.+?):\*\*\s*(.+)$/;
const TABLE_DIVIDER = /^:?-{3,}:?$/;

export const stripInline = (text) => text.replace(/\*\*|__|`/g, '').trim();

export const slugify = (text) =>
    stripInline(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export const parseTableRows = (lines) =>
    lines
        .map((line) => line.trim())
        .filter((line) => line.startsWith('|'))
        .map((line) =>
            line
                .replace(/^\||\|$/g, '')
                .split(/(?<!\\)\|/)
                .map((cell) => stripInline(cell.replace(/\\\|/g, '|')))
        )
        .filter((cells) => !cells.every((cell) => TABLE_DIVIDER.test(cell)));

const normalizeLabel = (label) => label.replace(/:$/, '').replace(/^total\s+/i, '').trim();

const parseFact = (line) => {
    const match = line.match(BULLET_FACT) || line.match(BOLD_FACT);
    return match ? { label: normalizeLabel(match[1]), value: match[2].trim() } : null;
};

/**
 * Splits a sprint report into cover metadata (title, period, KPI facts) and the
 * remaining body. Supports the "At a Glance" table format and the earlier
 * bullet-list preamble.
 */
export const parseReport = (markdown = '') => {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const titleIndex = lines.findIndex((line) => H1.test(line));
    const title = titleIndex >= 0 ? stripInline(lines[titleIndex].match(H1)[1]) : 'Sprint Report';

    const preamble = [];
    const sections = [];
    lines.forEach((line, index) => {
        if (index === titleIndex) return;
        const heading = line.match(H2);
        if (heading) sections.push({ title: stripInline(heading[1]), lines: [] });
        else if (sections.length) sections[sections.length - 1].lines.push(line);
        else preamble.push(line);
    });

    const glance = sections.find((section) => GLANCE_TITLE.test(section.title));
    const preambleFacts = preamble.map(parseFact);
    const facts = glance
        ? parseTableRows(glance.lines)
              .slice(1)
              .map(([label = '', value = '']) => ({ label: normalizeLabel(label), value }))
              .filter((fact) => fact.label && fact.value)
        : preambleFacts.filter(Boolean);

    const isPeriod = (fact) => /period/i.test(fact.label);
    const isSprint = (fact) => /^sprint$/i.test(fact.label);
    const sprintFact = facts.find(isSprint);
    const bodySections = sections.filter((section) => section !== glance);
    const preambleBody = preamble.filter((_, index) => !preambleFacts[index]).join('\n').trim();

    return {
        title,
        sprintName: sprintFact?.value || title.replace(/^sprint report:?\s*/i, '') || title,
        period: facts.find(isPeriod)?.value ?? null,
        kpis: facts.filter((fact) => !isPeriod(fact) && !isSprint(fact)),
        sections: bodySections.map((section) => ({ id: slugify(section.title), title: section.title })),
        body: [
            preambleBody,
            ...bodySections.map((section) => [`## ${section.title}`, ...section.lines].join('\n').trim()),
        ]
            .filter(Boolean)
            .join('\n\n'),
    };
};
