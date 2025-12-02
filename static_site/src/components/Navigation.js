import bscLogo from '../bsc-logo.svg';
import { hasCustomSettings } from './SettingsModal';

const Navigation = ({ activePage, onPageChange, onSettingsClick }) => {
    const pages = [
        { id: 'overview', label: 'Overview' },
        { id: 'features', label: 'Features' },
        { id: 'run', label: 'Run Agent' },
    ];

    return (
        <header className="nav-header">
            <div className="nav-container">
                <div className="nav-logo">
                    <img src={bscLogo} alt="Arc Agent" className="logo" />
                </div>
                <nav className="nav-links">
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
            </div>
        </header>
    );
};

export default Navigation;
