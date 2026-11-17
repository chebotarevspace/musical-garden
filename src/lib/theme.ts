/** Applies the colour theme to the page (attribute on <html> + the browser's theme colour). */
export type Theme = 'dark' | 'light';

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3eee5' : '#0b0a0c');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
}

export const isLight = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
