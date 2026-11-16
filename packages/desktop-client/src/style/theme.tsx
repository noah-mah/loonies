import { useEffect, useState } from 'react';

import paletteCss from '@actual-app/components/themes/palette.css?inline';
import semanticCss from '@actual-app/components/themes/semantic.css?inline';
import sidebarRedesignLightCss from '@actual-app/components/themes/sidebar-redesign-light.css?inline';
import type { Theme } from '@actual-app/core/types/prefs';

import { useGlobalPref } from '#hooks/useGlobalPref';

const themes = {
  light: { name: 'Light' },
  dark: { name: 'Dark' },
  auto: { name: 'System default' },
} as const;

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export function useTheme() {
  const [theme = 'auto', setThemePref] = useGlobalPref('theme');
  return [theme, setThemePref] as const;
}

export function shouldUseCossDarkClass(
  theme: Theme,
  systemScheme: 'light' | 'dark',
): boolean {
  if (theme === 'dark') return true;
  if (theme === 'auto') return systemScheme === 'dark';
  return false;
}

function readSystemScheme(): 'light' | 'dark' {
  const query = window.matchMedia?.('(prefers-color-scheme: dark)');
  return query?.matches ? 'dark' : 'light';
}

export function useCossDarkClass() {
  const [theme] = useTheme();
  const [systemScheme, setSystemScheme] = useState(readSystemScheme);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;

    const update = () => {
      setSystemScheme(query.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);

  const isDark = shouldUseCossDarkClass(theme, systemScheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);
}

export function ThemeStyle() {
  return (
    <>
      <style>{paletteCss}</style>
      <style>{semanticCss}</style>
      <style>{sidebarRedesignLightCss}</style>
    </>
  );
}
