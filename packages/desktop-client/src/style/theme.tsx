import darkThemeCss from '@actual-app/components/themes/dark.css?inline';
import lightThemeCss from '@actual-app/components/themes/light.css?inline';
import paletteCss from '@actual-app/components/themes/palette.css?inline';
import sidebarRedesignLightCss from '@actual-app/components/themes/sidebar-redesign-light.css?inline';
import type { Theme } from '@actual-app/core/types/prefs';

import { useGlobalPref } from '#hooks/useGlobalPref';

const themes = {
  light: { name: 'Light', colors: lightThemeCss },
  dark: { name: 'Dark', colors: darkThemeCss },
  auto: { name: 'System default' },
} as const;

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export function useTheme() {
  const [theme = 'auto', setThemePref] = useGlobalPref('theme');
  return [theme, setThemePref] as const;
}

export function ThemeStyle() {
  const [activeTheme] = useTheme();
  const resolvedTheme = activeTheme === 'dark' ? 'dark' : 'light';
  const themeColors = themes[resolvedTheme].colors;

  if (activeTheme !== 'auto') {
    return (
      <>
        <style>{paletteCss}</style>
        <style>{themeColors}</style>
        {activeTheme === 'light' && <style>{sidebarRedesignLightCss}</style>}
      </>
    );
  }

  return (
    <>
      <style>{paletteCss}</style>
      <style media="(prefers-color-scheme: light)">{themes.light.colors}</style>
      <style media="(prefers-color-scheme: light)">
        {sidebarRedesignLightCss}
      </style>
      <style media="(prefers-color-scheme: dark)">{themes.dark.colors}</style>
    </>
  );
}
