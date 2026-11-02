// Public App Store listing for the Arc Agent iOS/iPadOS app.
export const APP_STORE_ID = '6755940632';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

const BADGE_BASE = 'https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store';
export const APP_STORE_BADGES = { light: `${BADGE_BASE}/black/en-us`, dark: `${BADGE_BASE}/white/en-us` };
