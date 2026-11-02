const STORAGE_KEYS = {
    repos: 'arc_repos',
    sprintName: 'arc_sprint_name',
    since: 'arc_since',
    until: 'arc_until',
};

const SESSION_KEYS = {
    githubToken: 'arc_github_token',
};

// index.html reads the same key before first paint to avoid a theme flash.
const THEME_KEY = 'arc_theme';
export const THEME_PREFERENCES = ['light', 'system', 'dark'];

export const getThemePreference = () => {
    const stored = localStorage.getItem(THEME_KEY);
    return THEME_PREFERENCES.includes(stored) ? stored : 'system';
};

export const setThemePreference = (preference) => {
    if (preference === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
};

export const parseRepos = (value) =>
    value
        .split(/[\s,]+/)
        .map((repo) => repo.trim())
        .filter(Boolean);

const getDefaults = () => ({
    repos: import.meta.env.VITE_DEFAULT_REPOS || '',
    sprintName: import.meta.env.VITE_SPRINT_NAME || 'Sprint Analysis',
    since: import.meta.env.VITE_DEFAULT_SINCE || '',
    until: import.meta.env.VITE_DEFAULT_UNTIL || '',
});

export const POLL_INTERVAL_MS = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '10000', 10);
export const MAX_POLL_ATTEMPTS = parseInt(import.meta.env.VITE_MAX_POLL_ATTEMPTS || '30', 10);

export const getGithubToken = () => sessionStorage.getItem(SESSION_KEYS.githubToken) || '';

export const setGithubToken = (token) => {
    if (token) sessionStorage.setItem(SESSION_KEYS.githubToken, token);
    else sessionStorage.removeItem(SESSION_KEYS.githubToken);
};

export const getEffectiveSettings = () => {
    const defaults = getDefaults();
    return {
        githubToken: getGithubToken(),
        repos: localStorage.getItem(STORAGE_KEYS.repos) || defaults.repos,
        sprintName: localStorage.getItem(STORAGE_KEYS.sprintName) || defaults.sprintName,
        since: localStorage.getItem(STORAGE_KEYS.since) || defaults.since,
        until: localStorage.getItem(STORAGE_KEYS.until) || defaults.until,
    };
};

export const hasCustomSettings = () =>
    Boolean(getGithubToken()) || Object.values(STORAGE_KEYS).some((key) => localStorage.getItem(key));

export const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    try { return isoString.split('T')[0]; }
    catch { return ''; }
};

export const formatDateForAPI = (dateString) =>
    dateString ? `${dateString}T00:00:00Z` : '';

export { STORAGE_KEYS, SESSION_KEYS, THEME_KEY, getDefaults };
