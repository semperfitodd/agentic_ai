import { useCallback, useEffect, useState } from 'react';

export const ROUTES = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'run', label: 'Run agent' },
];

const DEFAULT_ROUTE = ROUTES[0].id;

export const routeFromHash = (hash) => {
    const id = hash.replace(/^#\/?/, '');
    return ROUTES.some((route) => route.id === id) ? id : DEFAULT_ROUTE;
};

export const useHashRoute = () => {
    const [route, setRoute] = useState(() => routeFromHash(window.location.hash));

    useEffect(() => {
        const onHashChange = () => {
            setRoute(routeFromHash(window.location.hash));
            window.scrollTo({ top: 0 });
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = useCallback((id) => {
        if (`#/${id}` === window.location.hash) return;
        window.location.hash = `/${id}`;
        setRoute(id);
    }, []);

    return [route, navigate];
};
