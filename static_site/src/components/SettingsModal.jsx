import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import {
    STORAGE_KEYS,
    getDefaults,
    getGithubToken,
    setGithubToken as storeGithubToken,
    formatDateForInput,
    formatDateForAPI,
    parseRepos,
} from '../config/settings';
import Dialog from './Dialog';

const Field = ({ id, label, hint, children }) => (
    <div className="field">
        <label htmlFor={id} className="field-label">
            {label}
        </label>
        {children}
        {hint && (
            <p id={`${id}-hint`} className="field-hint">
                {hint}
            </p>
        )}
    </div>
);

const SettingsModal = ({ show, onClose, onDeleteAccount }) => {
    const defaults = getDefaults();
    const [githubToken, setGithubToken] = useState('');
    const [repos, setRepos] = useState('');
    const [sprintName, setSprintName] = useState('');
    const [since, setSince] = useState('');
    const [until, setUntil] = useState('');

    useEffect(() => {
        if (show) {
            setGithubToken(getGithubToken());
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

    const handleSave = (event) => {
        event.preventDefault();
        storeGithubToken(githubToken);
        saveOrRemove(STORAGE_KEYS.repos, repos);
        saveOrRemove(STORAGE_KEYS.sprintName, sprintName, defaults.sprintName);
        saveOrRemove(STORAGE_KEYS.since, formatDateForAPI(since));
        saveOrRemove(STORAGE_KEYS.until, formatDateForAPI(until));
        onClose();
    };

    const handleReset = () => {
        Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
        storeGithubToken('');
        setGithubToken('');
        setRepos('');
        setSprintName('');
        setSince(formatDateForInput(defaults.since));
        setUntil(formatDateForInput(defaults.until));
    };

    const repoPreview = parseRepos(repos || defaults.repos);
    const invalidRange = Boolean(since && until && since > until);

    return (
        <Dialog open={show} onClose={onClose} labelledBy="settings-title" className="settings">
            <form className="dialog-form" onSubmit={handleSave} noValidate>
                <header className="dialog-header">
                    <div>
                        <h2 id="settings-title" className="text-h2">
                            Settings
                        </h2>
                        <p className="text-small text-secondary">Overrides are stored in this browser. Leave a field empty to use the default.</p>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings">
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                <div className="dialog-body">
                    <fieldset className="settings-group">
                        <legend className="overline">GitHub access</legend>
                        <Field id="settings-token" label="GitHub token" hint="Kept only for this browser tab and encrypted before it leaves the API.">
                            <input
                                id="settings-token"
                                type="password"
                                autoComplete="off"
                                spellCheck={false}
                                value={githubToken}
                                onChange={(e) => setGithubToken(e.target.value)}
                                placeholder="ghp_… (leave blank for public repos)"
                                className="input input-mono"
                                aria-describedby="settings-token-hint"
                            />
                        </Field>
                        {githubToken ? (
                            <span className="badge badge-success">Session token set</span>
                        ) : (
                            <span className="badge badge-neutral">Public repos only — no token set</span>
                        )}
                    </fieldset>

                    <fieldset className="settings-group">
                        <legend className="overline">Sprint</legend>
                        <Field id="settings-sprint" label="Sprint name">
                            <input
                                id="settings-sprint"
                                type="text"
                                value={sprintName}
                                onChange={(e) => setSprintName(e.target.value)}
                                placeholder={defaults.sprintName}
                                className="input"
                            />
                        </Field>
                        <div className="field-row" role="group" aria-label="Date range">
                            <Field id="settings-since" label="Start date">
                                <input
                                    id="settings-since"
                                    type="date"
                                    value={since}
                                    onChange={(e) => setSince(e.target.value)}
                                    className="input"
                                    aria-invalid={invalidRange}
                                />
                            </Field>
                            <Field id="settings-until" label="End date">
                                <input
                                    id="settings-until"
                                    type="date"
                                    value={until}
                                    onChange={(e) => setUntil(e.target.value)}
                                    className="input"
                                    aria-invalid={invalidRange}
                                />
                            </Field>
                        </div>
                        {invalidRange && (
                            <p className="field-error" role="alert">
                                The start date must be on or before the end date.
                            </p>
                        )}
                    </fieldset>

                    <fieldset className="settings-group">
                        <legend className="overline">Repositories</legend>
                        <Field id="settings-repos" label="Repositories" hint="Comma-separated owner/repo names or GitHub URLs.">
                            <textarea
                                id="settings-repos"
                                value={repos}
                                onChange={(e) => setRepos(e.target.value)}
                                placeholder="owner/repo1, owner/repo2"
                                className="input input-mono"
                                rows={3}
                                aria-describedby="settings-repos-hint"
                            />
                        </Field>
                        {repoPreview.length > 0 && (
                            <div className="repo-preview">
                                <span className="text-caption text-tertiary">{repos ? 'Will analyze' : 'Using default repositories'}</span>
                                <ul className="chip-list">
                                    {repoPreview.map((repo) => (
                                        <li key={repo} className="chip chip-mono">
                                            {repo}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </fieldset>

                    {onDeleteAccount && (
                        <fieldset className="settings-group danger-zone">
                            <legend className="overline">Account</legend>
                            <div className="danger-row">
                                <div>
                                    <p className="text-title">Delete account</p>
                                    <p className="text-small text-secondary">Permanently delete your account and sign out.</p>
                                </div>
                                <button type="button" className="btn btn-danger-outline btn-md" onClick={onDeleteAccount}>
                                    <Trash2 size={16} aria-hidden="true" />
                                    Delete account
                                </button>
                            </div>
                        </fieldset>
                    )}
                </div>

                <footer className="dialog-footer">
                    <button type="button" className="btn btn-ghost btn-md" onClick={handleReset}>
                        Reset to defaults
                    </button>
                    <div className="dialog-footer-end">
                        <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-md" disabled={invalidRange}>
                            Save settings
                        </button>
                    </div>
                </footer>
            </form>
        </Dialog>
    );
};

export default SettingsModal;
