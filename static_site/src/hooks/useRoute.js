import { useCallback, useEffect, useState } from 'react';

export const ROUTES = [
    { id: 'overview', label: 'Overview', path: '/' },
    { id: 'features', label: 'Features', path: '/features' },
    { id: 'run', label: 'Run agent', path: '/run' },
];

export const pathFor = (id) => ROUTES.find((route) => route.id === id)?.path ?? '/';

/** Resolves a route from the path, accepting the earlier `#/<id>` links too. */
export const routeFromLocation = ({ pathname = '/', hash = '' } = {}) => {
    const legacy = hash.match(/^#\/(\w+)/)?.[1];
    const path = legacy ? pathFor(legacy) : pathname.replace(/\/+$/, '') || '/';
    return ROUTES.find((route) => route.path === path)?.id ?? 'overview';
};

export const useRoute = (initialRoute) => {
    const [route, setRoute] = useState(() => initialRoute ?? routeFromLocation(window.location));

    useEffect(() => {
        if (/^#\/\w+/.test(window.location.hash)) window.history.replaceState(null, '', pathFor(routeFromLocation(window.location)));
        const onPopState = () => setRoute(routeFromLocation(window.location));
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const navigate = useCallback((id) => {
        const path = pathFor(id);
        if (window.location.pathname !== path) window.history.pushState(null, '', path);
        setRoute(id);
        window.scrollTo({ top: 0 });
    }, []);

    return [route, navigate];
};
