const STORAGE_KEYS = {
    githubToken: 'arc_github_token',
    repos: 'arc_repos',
    sprintName: 'arc_sprint_name',
    since: 'arc_since',
    until: 'arc_until',
};

const getDefaults = () => ({
    githubToken: process.env.REACT_APP_GITHUB_TOKEN || '',
    repos: process.env.REACT_APP_DEFAULT_REPOS || '',
    sprintName: process.env.REACT_APP_SPRINT_NAME || 'Sprint Analysis',
    since: process.env.REACT_APP_DEFAULT_SINCE || '',
    until: process.env.REACT_APP_DEFAULT_UNTIL || '',
});

export const POLL_INTERVAL_MS = parseInt(process.env.REACT_APP_POLL_INTERVAL_MS || '10000', 10);
export const MAX_POLL_ATTEMPTS = parseInt(process.env.REACT_APP_MAX_POLL_ATTEMPTS || '30', 10);

export const getEffectiveSettings = () => {
    const defaults = getDefaults();
    return {
        githubToken: localStorage.getItem(STORAGE_KEYS.githubToken) || defaults.githubToken,
        repos: localStorage.getItem(STORAGE_KEYS.repos) || defaults.repos,
        sprintName: localStorage.getItem(STORAGE_KEYS.sprintName) || defaults.sprintName,
        since: localStorage.getItem(STORAGE_KEYS.since) || defaults.since,
        until: localStorage.getItem(STORAGE_KEYS.until) || defaults.until,
    };
};

export const hasCustomSettings = () =>
    Object.values(STORAGE_KEYS).some((key) => localStorage.getItem(key));

export const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    try { return isoString.split('T')[0]; }
    catch { return ''; }
};

export const formatDateForAPI = (dateString) =>
    dateString ? `${dateString}T00:00:00Z` : '';

export { STORAGE_KEYS, getDefaults };
