/**
 * Theme constants shared by the server layout and the client ThemeProvider.
 * Kept in a plain (non-"use client") module so the server layout imports the
 * real string — not a client reference.
 */
export const THEME_STORAGE_KEY = "theme";

/**
 * Inline script rendered by the server root layout. Runs before paint to set
 * the `.dark` class + color-scheme from the stored preference (or the OS),
 * preventing a flash of the wrong theme. Server-rendered, so React never
 * re-renders it on the client (avoids React 19's client-script warning).
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
