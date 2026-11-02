import { render, screen } from '@testing-library/react';
import AppStoreBadge from '../components/AppStoreBadge';
import { APP_STORE_ID, APP_STORE_URL } from '../config/appStore';

describe('AppStoreBadge', () => {
    it('links to the App Store listing with theme-specific official badges', () => {
        const { container } = render(<AppStoreBadge />);
        const link = screen.getByRole('link', { name: 'Download Arc Agent on the App Store' });
        expect(link).toHaveAttribute('href', `https://apps.apple.com/app/id${APP_STORE_ID}`);
        expect(APP_STORE_URL).toBe(link.getAttribute('href'));
        const [light, dark] = container.querySelectorAll('img');
        expect(light.src).toMatch(/download-on-the-app-store\/black/);
        expect(dark.src).toMatch(/download-on-the-app-store\/white/);
    });
});
