import { useCallback, useEffect, useState } from 'react';
import { getThemePreference, setThemePreference } from '../config/settings';

export const applyTheme = (preference, root = document.documentElement) => {
    if (preference === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', preference);
};

export const useTheme = () => {
    const [preference, setPreference] = useState(getThemePreference);

    useEffect(() => {
        applyTheme(preference);
    }, [preference]);

    const choose = useCallback((next) => {
        setThemePreference(next);
        setPreference(next);
    }, []);

    return { preference, setPreference: choose };
};
