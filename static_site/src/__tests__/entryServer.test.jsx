// @vitest-environment node
import { render } from '../entry-server';

describe('prerendered routes', () => {
    it('renders the overview with its headline, App Store badge, and author credit', () => {
        const html = render('overview');
        expect(html).toContain('Turn a sprint of pull requests into an executive-ready report.');
        expect(html).toContain('href="https://apps.apple.com/app/id');
        expect(html).toMatch(/Created by.*href="https:\/\/toddbernson\.com" rel="author"/s);
    });

    it('renders features with final stat values and visible cards for crawlers', () => {
        const html = render('features');
        expect(html).toContain('Powered by agentic AI');
        expect(html).toMatch(/aria-label="20">20</);
        expect(html).toContain('feature-grid is-visible');
    });

    it('renders the run page signed out', () => {
        expect(render('run')).toContain('Sign in to run');
    });
});
