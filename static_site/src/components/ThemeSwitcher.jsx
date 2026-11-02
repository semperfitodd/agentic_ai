import { Monitor, Moon, Sun } from 'lucide-react';

const OPTIONS = [
    { id: 'light', label: 'Light theme', Icon: Sun },
    { id: 'system', label: 'System theme', Icon: Monitor },
    { id: 'dark', label: 'Dark theme', Icon: Moon },
];

const ThemeSwitcher = ({ value, onChange, className = '' }) => (
    <div className={`theme-switcher ${className}`} role="group" aria-label="Color theme">
        {OPTIONS.map(({ id, label, Icon }) => (
            <button
                key={id}
                type="button"
                aria-pressed={value === id}
                aria-label={label}
                title={label}
                className="theme-option"
                onClick={() => onChange(id)}
            >
                <Icon size={16} aria-hidden="true" />
            </button>
        ))}
    </div>
);

export default ThemeSwitcher;
