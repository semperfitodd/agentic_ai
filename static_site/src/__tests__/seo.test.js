import { INDEXED_PATHS, PAGE_META, structuredData } from '../config/seo';

describe('SEO metadata', () => {
    it('gives every route a unique title and a search-length description', () => {
        const pages = Object.values(PAGE_META);
        expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length);
        for (const page of pages) {
            expect(page.title.length).toBeLessThanOrEqual(60);
            expect(page.description.length).toBeGreaterThanOrEqual(70);
            expect(page.description.length).toBeLessThanOrEqual(170);
        }
    });

    it('keeps the signed-in run page out of the sitemap', () => {
        expect(INDEXED_PATHS).toEqual(['/', '/features', '/privacy.html', '/support.html']);
    });

    it('describes the app and credits Todd Bernson in structured data', () => {
        const graph = structuredData('https://app.example.com')['@graph'];
        const app = graph.find((node) => node['@type'] === 'SoftwareApplication');
        const person = graph.find((node) => node['@type'] === 'Person');
        expect(app).toMatchObject({ url: 'https://app.example.com/', operatingSystem: 'Web, iOS, iPadOS', author: { '@id': person['@id'] } });
        expect(app.sameAs[0]).toMatch(/^https:\/\/apps\.apple\.com\/app\/id\d+$/);
        expect(person).toMatchObject({ name: 'Todd Bernson', url: 'https://toddbernson.com' });
    });
});
