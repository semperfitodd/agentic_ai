const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export const safeReportUrl = (href = '') => {
    const trimmed = href.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('#')) return trimmed;

    try {
        const parsed = new URL(trimmed);
        return ALLOWED_PROTOCOLS.has(parsed.protocol) ? trimmed : '';
    } catch {
        return /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) ? trimmed : '';
    }
};

export const safeReportUrlTransform = (url) => safeReportUrl(url);
