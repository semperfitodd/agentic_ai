// Pages are prerendered at build time, where browser storage does not exist.
const NO_STORAGE = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const local = () => (typeof window === 'undefined' ? NO_STORAGE : window.localStorage);
const session = () => (typeof window === 'undefined' ? NO_STORAGE : window.sessionStorage);

const STORAGE_KEYS = {
    repos: 'arc_repos',
    sprintName: 'arc_sprint_name',
    since: 'arc_since',
    until: 'arc_until',
};

const SESSION_KEYS = {
    githubToken: 'arc_github_token',
    githubTokenSubject: 'arc_github_token_subject',
};

// index.html reads the same key before first paint to avoid a theme flash.
const THEME_KEY = 'arc_theme';
export const THEME_PREFERENCES = ['light', 'system', 'dark'];

export const getThemePreference = () => {
    const stored = local().getItem(THEME_KEY);
    return THEME_PREFERENCES.includes(stored) ? stored : 'system';
};

export const setThemePreference = (preference) => {
    if (preference === 'system') local().removeItem(THEME_KEY);
    else local().setItem(THEME_KEY, preference);
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

export const clearGithubToken = () => {
    session().removeItem(SESSION_KEYS.githubToken);
    session().removeItem(SESSION_KEYS.githubTokenSubject);
};

export const getGithubToken = () => session().getItem(SESSION_KEYS.githubToken) || '';

export const setGithubToken = (token, subject) => {
    if (token && subject) {
        session().setItem(SESSION_KEYS.githubToken, token);
        session().setItem(SESSION_KEYS.githubTokenSubject, subject);
    } else {
        clearGithubToken();
    }
};

export const reconcileGithubTokenSubject = (subject) => {
    if (!session().getItem(SESSION_KEYS.githubToken)) return;
    const storedSubject = session().getItem(SESSION_KEYS.githubTokenSubject);
    if (!subject || storedSubject !== subject) clearGithubToken();
};

export const getEffectiveSettings = () => {
    const defaults = getDefaults();
    return {
        githubToken: getGithubToken(),
        repos: local().getItem(STORAGE_KEYS.repos) || defaults.repos,
        sprintName: local().getItem(STORAGE_KEYS.sprintName) || defaults.sprintName,
        since: local().getItem(STORAGE_KEYS.since) || defaults.since,
        until: local().getItem(STORAGE_KEYS.until) || defaults.until,
    };
};

export const hasCustomSettings = () =>
    Boolean(getGithubToken()) || Object.values(STORAGE_KEYS).some((key) => local().getItem(key));

export const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    try { return isoString.split('T')[0]; }
    catch { return ''; }
};

export const formatDateForAPI = (dateString) =>
    dateString ? `${dateString}T00:00:00Z` : '';

export { STORAGE_KEYS, SESSION_KEYS, THEME_KEY, getDefaults };
