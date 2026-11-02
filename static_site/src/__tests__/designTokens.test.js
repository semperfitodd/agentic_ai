import { readFileSync } from 'node:fs';
import { buildCss, buildJs, buildSwift, contrastRatio, loadTokens, OUTPUTS, semanticColors } from '../../../design/build-tokens.mjs';

const tokens = loadTokens();

describe('design tokens', () => {
    it.each([
        ['css', buildCss],
        ['js', buildJs],
        ['swift', buildSwift],
    ])('generated %s output is in sync with design/tokens.json', (key, build) => {
        expect(readFileSync(OUTPUTS[key], 'utf8')).toBe(build(tokens));
    });

    it.each(['light', 'dark'])('meets the declared WCAG contrast pairs in %s mode', (mode) => {
        const colors = semanticColors(tokens, mode);
        const failures = tokens.contrast
            .map(([fg, bg, min]) => ({ pair: `${fg} on ${bg}`, ratio: contrastRatio(colors[fg], colors[bg]), min }))
            .filter(({ ratio, min }) => ratio < min);
        expect(failures).toEqual([]);
    });

    it('defines every semantic color for both modes', () => {
        for (const refs of Object.values(tokens.semantic)) expect(refs).toHaveLength(2);
    });
});
