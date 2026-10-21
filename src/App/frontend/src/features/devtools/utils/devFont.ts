/**
 * Fonts that can be tried out from DevTools. The value is set as the data-font attribute on <html>, which
 * selects --font-family in global.css. Without the attribute, the app uses Altinn-DIN.
 */
export const fontKeys = ['altinn-din', 'inter'] as const;
export type Font = (typeof fontKeys)[number];

const fontSearchParam = 'font';

export function getFontName(font: Font): string {
  const names: Record<Font, string> = {
    'altinn-din': 'Altinn-DIN',
    inter: 'Inter',
  };
  return names[font];
}

export function isFont(value: string | null | undefined): value is Font {
  return fontKeys.some((font) => font === value);
}

export function getCurrentFont(): Font {
  const font = document.documentElement.dataset.font;
  return isFont(font) ? font : 'altinn-din';
}

export function setFont(font: Font) {
  document.documentElement.dataset.font = font;
}

/**
 * Sets the font from the ?font= search param, for example ?font=inter. Call before the first render.
 */
export function applyFontFromUrl() {
  const font = new URLSearchParams(window.location.search).get(fontSearchParam);
  if (isFont(font)) {
    setFont(font);
  }
}
