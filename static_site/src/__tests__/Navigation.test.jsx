import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../components/Navigation';
import { applyTheme } from '../hooks/useTheme';
import { pathFor, routeFromLocation } from '../hooks/useRoute';
import { getThemePreference, setThemePreference } from '../config/settings';

const renderNav = (props = {}) =>
    render(
        <Navigation
            route="overview"
            onNavigate={vi.fn()}
            onSettingsClick={vi.fn()}
            hasCustomSettings={false}
            isAuthenticated={false}
            onSignIn={vi.fn()}
            onSignOut={vi.fn()}
            themePreference="system"
            onThemeChange={vi.fn()}
            {...props}
        />
    );

describe('Navigation', () => {
    it('marks the current page and navigates between pages', () => {
        const onNavigate = vi.fn();
        renderNav({ route: 'features', onNavigate });
        const primary = screen.getByRole('navigation', { name: 'Primary' });
        expect(primary.querySelector('[aria-current="page"]')).toHaveTextContent('Features');
        const runLink = screen.getAllByRole('link', { name: 'Run agent' })[0];
        expect(runLink).toHaveAttribute('href', '/run');
        fireEvent.click(runLink);
        expect(onNavigate).toHaveBeenCalledWith('run');
    });

    it('changes the theme from the switcher', () => {
        const onThemeChange = vi.fn();
        renderNav({ onThemeChange });
        expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
        expect(onThemeChange).toHaveBeenCalledWith('dark');
    });

    it('opens the mobile menu and closes it with Escape', () => {
        renderNav();
        fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
        expect(screen.getByRole('navigation', { name: 'Primary mobile' })).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('navigation', { name: 'Primary mobile' })).toBeNull();
    });

    it('signs in with the current route', () => {
        const onSignIn = vi.fn();
        renderNav({ route: 'run', onSignIn });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(onSignIn).toHaveBeenCalledWith('run');
    });

    it('shows the custom settings indicator', () => {
        const { container } = renderNav({ hasCustomSettings: true });
        expect(container.querySelector('.icon-btn-dot')).not.toBeNull();
    });
});

describe('theme preference', () => {
    beforeEach(() => localStorage.clear());

    it('persists light and dark, and clears for system', () => {
        expect(getThemePreference()).toBe('system');
        setThemePreference('dark');
        expect(getThemePreference()).toBe('dark');
        setThemePreference('system');
        expect(localStorage.getItem('arc_theme')).toBeNull();
    });

    it('applies the preference to the root element', () => {
        const root = document.createElement('html');
        applyTheme('light', root);
        expect(root.getAttribute('data-theme')).toBe('light');
        applyTheme('system', root);
        expect(root.hasAttribute('data-theme')).toBe(false);
    });
});

describe('routeFromLocation', () => {
    it('maps paths, trailing slashes, and legacy hash links', () => {
        expect(routeFromLocation({ pathname: '/run' })).toBe('run');
        expect(routeFromLocation({ pathname: '/features/' })).toBe('features');
        expect(routeFromLocation({ pathname: '/', hash: '#/features' })).toBe('features');
        expect(routeFromLocation({ pathname: '/unknown' })).toBe('overview');
        expect(pathFor('overview')).toBe('/');
    });
});
