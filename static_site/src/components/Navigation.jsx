import { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, Menu, Settings, X } from 'lucide-react';
import bscLogo from '../bsc-logo.svg';
import bscLogoDark from '../bsc-logo-dark.svg';
import { ROUTES } from '../hooks/useHashRoute';
import ThemeSwitcher from './ThemeSwitcher';

const Navigation = ({
    route,
    onNavigate,
    onSettingsClick,
    hasCustomSettings,
    isAuthenticated,
    onSignIn,
    onSignOut,
    themePreference,
    onThemeChange,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const header = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const onPointerDown = (event) => {
            if (!header.current?.contains(event.target)) setMenuOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const go = (id) => {
        onNavigate(id);
        setMenuOpen(false);
    };

    const authButton = (className) =>
        isAuthenticated ? (
            <button type="button" className={`btn btn-secondary ${className}`} onClick={onSignOut}>
                <LogOut size={16} aria-hidden="true" />
                Sign out
            </button>
        ) : (
            <button type="button" className={`btn btn-primary ${className}`} onClick={() => onSignIn(route)}>
                <LogIn size={16} aria-hidden="true" />
                Sign in
            </button>
        );

    return (
        <header className="nav" ref={header}>
            <div className="nav-inner">
                <a className="nav-brand" href="#/overview" onClick={() => setMenuOpen(false)}>
                    <img src={bscLogo} alt="BSC Analytics" className="nav-logo theme-light-only" />
                    <img src={bscLogoDark} alt="BSC Analytics" className="nav-logo theme-dark-only" />
                    <span className="nav-divider" aria-hidden="true" />
                    <span className="nav-wordmark">
                        <span className="nav-product">Arc Agent</span>
                        <span className="nav-tagline">Sprint Intelligence</span>
                    </span>
                </a>

                <nav className="nav-tabs" aria-label="Primary">
                    {ROUTES.map(({ id, label }) => (
                        <a
                            key={id}
                            href={`#/${id}`}
                            className="nav-tab"
                            aria-current={route === id ? 'page' : undefined}
                            onClick={(event) => {
                                event.preventDefault();
                                go(id);
                            }}
                        >
                            {label}
                        </a>
                    ))}
                </nav>

                <div className="nav-actions">
                    <ThemeSwitcher value={themePreference} onChange={onThemeChange} className="nav-desktop-only" />
                    <button type="button" className="icon-btn" onClick={onSettingsClick} aria-label="Settings" title="Settings">
                        <Settings size={20} aria-hidden="true" />
                        {hasCustomSettings && <span className="icon-btn-dot" aria-hidden="true" />}
                    </button>
                    {authButton('btn-sm nav-desktop-only')}
                    <button
                        type="button"
                        className="icon-btn nav-menu-toggle"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        aria-controls="nav-menu"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div id="nav-menu" className="nav-menu">
                    <nav aria-label="Primary mobile">
                        {ROUTES.map(({ id, label }) => (
                            <a
                                key={id}
                                href={`#/${id}`}
                                className="nav-menu-link"
                                aria-current={route === id ? 'page' : undefined}
                                onClick={(event) => {
                                    event.preventDefault();
                                    go(id);
                                }}
                            >
                                {label}
                            </a>
                        ))}
                    </nav>
                    <div className="nav-menu-row">
                        <span className="nav-menu-label">Appearance</span>
                        <ThemeSwitcher value={themePreference} onChange={onThemeChange} />
                    </div>
                    {authButton('btn-lg btn-block')}
                </div>
            )}
        </header>
    );
};

export default Navigation;
