import { useState, useEffect } from 'react';
import bscLogo from '../bsc-logo.svg';
import { hasCustomSettings } from './SettingsModal';

const Navigation = ({ activePage, onPageChange, onSettingsClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const pages = [
        { id: 'overview', label: 'Overview' },
        { id: 'features', label: 'Features' },
        { id: 'run', label: 'Run Agent' },
    ];

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isMenuOpen && !e.target.closest('.nav-container')) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isMenuOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsMenuOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handlePageChange = (pageId) => {
        onPageChange(pageId);
        setIsMenuOpen(false);
    };

    const handleSettingsClick = () => {
        onSettingsClick();
        setIsMenuOpen(false);
    };

    return (
        <header className="nav-header">
            <div className="nav-container">
                <div className="nav-logo">
                    <img src={bscLogo} alt="Arc Agent" className="logo" />
                </div>
                
                {/* Desktop Navigation */}
                <nav className="nav-links nav-desktop">
                    {pages.map(page => (
                        <button
                            key={page.id}
                            className={`nav-link ${activePage === page.id ? 'active' : ''}`}
                            onClick={() => onPageChange(page.id)}
                        >
                            {page.label}
                        </button>
                    ))}
                </nav>

                <div className="nav-actions">
                    <button
                        className={`nav-settings ${hasCustomSettings() ? 'has-custom' : ''}`}
                        onClick={onSettingsClick}
                        title="Settings"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        {hasCustomSettings() && <span className="settings-dot" />}
                    </button>

                    {/* Hamburger Menu Button */}
                    <button
                        className={`nav-hamburger ${isMenuOpen ? 'open' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>
                </div>

                {/* Mobile Menu */}
                <nav className={`nav-mobile ${isMenuOpen ? 'open' : ''}`}>
                    {pages.map(page => (
                        <button
                            key={page.id}
                            className={`nav-mobile-link ${activePage === page.id ? 'active' : ''}`}
                            onClick={() => handlePageChange(page.id)}
                        >
                            {page.label}
                        </button>
                    ))}
                    <button
                        className={`nav-mobile-link nav-mobile-settings ${hasCustomSettings() ? 'has-custom' : ''}`}
                        onClick={handleSettingsClick}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Settings
                        {hasCustomSettings() && <span className="mobile-settings-indicator">Custom</span>}
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default Navigation;
