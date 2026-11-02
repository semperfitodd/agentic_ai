const getAuthority = () => import.meta.env.VITE_COGNITO_AUTHORITY;
const getClientId = () => import.meta.env.VITE_COGNITO_CLIENT_ID;
const getDomain = () => import.meta.env.VITE_COGNITO_DOMAIN;

export const buildOidcConfig = (origin = window.location.origin) => ({
    authority: getAuthority(),
    client_id: getClientId(),
    redirect_uri: `${origin}/`,
    post_logout_redirect_uri: `${origin}/`,
    response_type: 'code',
    scope: 'openid email',
    automaticSilentRenew: true,
    onSigninCallback: () => {
        window.history.replaceState({}, document.title, window.location.pathname);
    },
});

export const buildSignOutUrl = (origin = window.location.origin) => {
    const url = new URL(`${getDomain()}/logout`);
    url.searchParams.set('client_id', getClientId());
    url.searchParams.set('logout_uri', `${origin}/`);
    return url.toString();
};
