import { APP_STORE_BADGES, APP_STORE_URL } from '../config/appStore';

/** Apple's official "Download on the App Store" badge, black in light mode and white in dark mode. */
const AppStoreBadge = ({ height = 40, className = '' }) => (
    <a className={`app-store-badge ${className}`} href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Download Arc Agent on the App Store">
        <img src={APP_STORE_BADGES.light} alt="" height={height} className="theme-light-only" />
        <img src={APP_STORE_BADGES.dark} alt="" height={height} className="theme-dark-only" />
    </a>
);

export default AppStoreBadge;
