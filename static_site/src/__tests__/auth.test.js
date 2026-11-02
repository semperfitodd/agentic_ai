import { buildOidcConfig, buildSignOutUrl } from '../config/auth';

beforeEach(() => {
    vi.stubEnv('VITE_COGNITO_AUTHORITY', 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client123');
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://auth.example.com');
});

describe('auth config', () => {
    it('builds an authorization-code OIDC config for the current origin', () => {
        const config = buildOidcConfig('https://app.example.com');
        expect(config.authority).toBe('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test');
        expect(config.client_id).toBe('client123');
        expect(config.redirect_uri).toBe('https://app.example.com/');
        expect(config.response_type).toBe('code');
    });

    it('builds the Cognito logout URL', () => {
        const url = new URL(buildSignOutUrl('https://app.example.com'));
        expect(url.origin + url.pathname).toBe('https://auth.example.com/logout');
        expect(url.searchParams.get('client_id')).toBe('client123');
        expect(url.searchParams.get('logout_uri')).toBe('https://app.example.com/');
    });
});
