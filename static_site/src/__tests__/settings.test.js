import { getEffectiveSettings, hasCustomSettings, formatDateForInput, formatDateForAPI } from '../config/settings';

describe('settings config', () => {
    beforeEach(() => {
        localStorage.clear();
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

        it('returns localStorage values over env defaults', () => {
            localStorage.setItem('arc_github_token', 'ghp_test_token');
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
            localStorage.setItem('arc_github_token', 'token');
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
