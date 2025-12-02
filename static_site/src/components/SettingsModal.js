import { useState, useEffect } from 'react';

const STORAGE_KEYS = {
    githubToken: 'arc_github_token',
    repos: 'arc_repos',
    sprintName: 'arc_sprint_name',
    since: 'arc_since',
    until: 'arc_until',
};

const getDefaults = () => ({
    githubToken: process.env.REACT_APP_GITHUB_TOKEN || '',
    repos: process.env.REACT_APP_DEFAULT_REPOS || '',
    sprintName: process.env.REACT_APP_SPRINT_NAME || 'Sprint Analysis',
    since: process.env.REACT_APP_DEFAULT_SINCE || '',
    until: process.env.REACT_APP_DEFAULT_UNTIL || '',
});

export const getEffectiveSettings = () => {
    const defaults = getDefaults();
    return {
        githubToken: localStorage.getItem(STORAGE_KEYS.githubToken) || defaults.githubToken,
        repos: localStorage.getItem(STORAGE_KEYS.repos) || defaults.repos,
        sprintName: localStorage.getItem(STORAGE_KEYS.sprintName) || defaults.sprintName,
        since: localStorage.getItem(STORAGE_KEYS.since) || defaults.since,
        until: localStorage.getItem(STORAGE_KEYS.until) || defaults.until,
    };
};

export const hasCustomSettings = () =>
    Object.values(STORAGE_KEYS).some(key => localStorage.getItem(key));

const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    try { return isoString.split('T')[0]; }
    catch { return ''; }
};

const formatDateForAPI = (dateString) =>
    dateString ? `${dateString}T00:00:00Z` : '';

const SettingsModal = ({ show, onClose }) => {
    const defaults = getDefaults();
    const [githubToken, setGithubToken] = useState('');
    const [repos, setRepos] = useState('');
    const [sprintName, setSprintName] = useState('');
    const [since, setSince] = useState('');
    const [until, setUntil] = useState('');

    useEffect(() => {
        if (show) {
            setGithubToken(localStorage.getItem(STORAGE_KEYS.githubToken) || '');
            setRepos(localStorage.getItem(STORAGE_KEYS.repos) || '');
            setSprintName(localStorage.getItem(STORAGE_KEYS.sprintName) || '');
            setSince(formatDateForInput(localStorage.getItem(STORAGE_KEYS.since) || defaults.since));
            setUntil(formatDateForInput(localStorage.getItem(STORAGE_KEYS.until) || defaults.until));
        }
    }, [show, defaults.since, defaults.until]);

    const saveOrRemove = (key, value, defaultValue = '') => {
        if (value && value !== defaultValue) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    };

    const handleSave = () => {
        saveOrRemove(STORAGE_KEYS.githubToken, githubToken);
        saveOrRemove(STORAGE_KEYS.repos, repos);
        saveOrRemove(STORAGE_KEYS.sprintName, sprintName, defaults.sprintName);
        saveOrRemove(STORAGE_KEYS.since, formatDateForAPI(since));
        saveOrRemove(STORAGE_KEYS.until, formatDateForAPI(until));
        onClose();
    };

    const handleReset = () => {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setGithubToken('');
        setRepos('');
        setSprintName('');
        setSince(formatDateForInput(defaults.since));
        setUntil(formatDateForInput(defaults.until));
    };

    if (!show) return null;

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>⚙️ Settings</h2>
                    <button className="settings-close" onClick={onClose}>×</button>
                </div>

                <div className="settings-content">
                    <p className="settings-description">
                        Override default configuration values. Leave fields empty to use defaults.
                    </p>

                    <div className="settings-section">
                        <label>
                            <span className="label-text">GitHub Token</span>
                            <span className="label-hint">Personal access token for API authentication</span>
                        </label>
                        <input
                            type="password"
                            value={githubToken}
                            onChange={e => setGithubToken(e.target.value)}
                            placeholder="Enter custom token (optional)"
                            className="settings-input"
                        />
                        {!githubToken && <span className="status-badge default">Using default token</span>}
                    </div>

                    <div className="settings-section">
                        <label>
                            <span className="label-text">Sprint Name</span>
                            <span className="label-hint">Custom name for your sprint analysis</span>
                        </label>
                        <input
                            type="text"
                            value={sprintName}
                            onChange={e => setSprintName(e.target.value)}
                            placeholder={defaults.sprintName}
                            className="settings-input"
                        />
                    </div>

                    <div className="settings-section">
                        <label>
                            <span className="label-text">Date Range</span>
                            <span className="label-hint">Analysis period for sprint reports</span>
                        </label>
                        <div className="date-inputs">
                            <div className="date-field">
                                <span>Start Date</span>
                                <input
                                    type="date"
                                    value={since}
                                    onChange={e => setSince(e.target.value)}
                                    className="settings-input"
                                />
                            </div>
                            <div className="date-field">
                                <span>End Date</span>
                                <input
                                    type="date"
                                    value={until}
                                    onChange={e => setUntil(e.target.value)}
                                    className="settings-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <label>
                            <span className="label-text">Repositories</span>
                            <span className="label-hint">Comma-separated list of repos (owner/repo)</span>
                        </label>
                        <textarea
                            value={repos}
                            onChange={e => setRepos(e.target.value)}
                            placeholder="owner/repo1, owner/repo2"
                            className="settings-input settings-textarea"
                            rows={3}
                        />
                        {!repos && <span className="status-badge default">Using default repositories</span>}
                    </div>
                </div>

                <div className="settings-actions">
                    <button className="btn-reset" onClick={handleReset}>Reset to Defaults</button>
                    <div className="settings-actions-right">
                        <button className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button className="btn-save" onClick={handleSave}>Save Settings</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
