import {
    SESSION_KEYS,
    clearGithubToken,
    getEffectiveSettings,
    getGithubToken,
    hasCustomSettings,
    formatDateForInput,
    formatDateForAPI,
    reconcileGithubTokenSubject,
    setGithubToken,
} from '../config/settings';

describe('settings config', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('getEffectiveSettings', () => {
        it('returns env defaults when localStorage is empty', () => {
            const settings = getEffectiveSettings();
            expect(settings).toHaveProperty('githubToken');
            expect(settings).toHaveProperty('repos');
            expect(settings).toHaveProperty('sprintName');
            expect(settings).toHaveProperty('since');
            expect(settings).toHaveProperty('until');
        });

        it('reads the GitHub token from sessionStorage, never localStorage', () => {
            localStorage.setItem('arc_github_token', 'ghp_persisted');
            expect(getEffectiveSettings().githubToken).toBe('');
            sessionStorage.setItem('arc_github_token', 'ghp_session');
            expect(getEffectiveSettings().githubToken).toBe('ghp_session');
        });

        it('returns stored values over env defaults', () => {
            sessionStorage.setItem('arc_github_token', 'ghp_test_token');
            localStorage.setItem('arc_repos', 'owner/repo1');
            const settings = getEffectiveSettings();
            expect(settings.githubToken).toBe('ghp_test_token');
            expect(settings.repos).toBe('owner/repo1');
        });

        it('falls back to env default when localStorage key is absent', () => {
            const settings = getEffectiveSettings();
            expect(typeof settings.sprintName).toBe('string');
        });
    });

    describe('hasCustomSettings', () => {
        it('returns false when localStorage is empty', () => {
            expect(hasCustomSettings()).toBe(false);
        });

        it('returns true when any storage key is set', () => {
            localStorage.setItem('arc_repos', 'owner/repo');
            expect(hasCustomSettings()).toBe(true);
        });

        it('returns true when a session GitHub token is set', () => {
            sessionStorage.setItem('arc_github_token', 'token');
            expect(hasCustomSettings()).toBe(true);
        });
    });

    describe('formatDateForInput', () => {
        it('returns YYYY-MM-DD from an ISO string', () => {
            expect(formatDateForInput('2024-06-15T00:00:00Z')).toBe('2024-06-15');
        });

        it('returns empty string for null/undefined', () => {
            expect(formatDateForInput(null)).toBe('');
            expect(formatDateForInput(undefined)).toBe('');
            expect(formatDateForInput('')).toBe('');
        });
    });

    describe('GitHub token subject binding', () => {
        it('stores the token with the Cognito sub', () => {
            setGithubToken('ghp_test', 'sub-abc');
            expect(getGithubToken()).toBe('ghp_test');
            expect(sessionStorage.getItem(SESSION_KEYS.githubTokenSubject)).toBe('sub-abc');
        });

        it('clears the token when the subject mismatches', () => {
            setGithubToken('ghp_test', 'sub-abc');
            reconcileGithubTokenSubject('sub-other');
            expect(getGithubToken()).toBe('');
        });

        it('keeps the token when the subject matches', () => {
            setGithubToken('ghp_test', 'sub-abc');
            reconcileGithubTokenSubject('sub-abc');
            expect(getGithubToken()).toBe('ghp_test');
        });

        it('clearGithubToken removes the token and subject', () => {
            setGithubToken('ghp_test', 'sub-abc');
            clearGithubToken();
            expect(getGithubToken()).toBe('');
            expect(sessionStorage.getItem(SESSION_KEYS.githubTokenSubject)).toBeNull();
        });
    });

    describe('formatDateForAPI', () => {
        it('appends T00:00:00Z', () => {
            expect(formatDateForAPI('2024-06-15')).toBe('2024-06-15T00:00:00Z');
        });

        it('returns empty string for falsy input', () => {
            expect(formatDateForAPI('')).toBe('');
            expect(formatDateForAPI(null)).toBe('');
        });
    });
});
