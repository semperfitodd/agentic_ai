import { renderToString } from 'react-dom/server';
import { AuthContext } from 'react-oidc-context';
import App from './App';

const signedOut = { isAuthenticated: false, isLoading: false, user: null };

/** Renders a route to static HTML for crawlers; the client re-renders it on load. */
export const render = (route) =>
    renderToString(
        <AuthContext.Provider value={signedOut}>
            <App initialRoute={route} />
        </AuthContext.Provider>
    );
