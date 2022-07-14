import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAltinnLogoProps } from './AltinnLogo';
import { AltinnLogo } from './AltinnLogo';
import altinnTheme from '../../src/theme/altinnAppTheme';

describe('AltinnLogo', () => {
  it('should have black image src and custom color as filter class when passing a custom color string', () => {
    render({ color: '#E58F65' });

    const img = getImage();
    expect(img.src).toContain('Altinn-logo-black.svg');
    expect(img.className).toContain('logo-filter-E58F65');
  });

  it('should have white image src and no custom color as filter class when passing white as color', () => {
    render({ color: 'white' });

    const img = getImage();
    expect(img.src).toContain('Altinn-logo-white.svg');
    expect(img.className).not.toContain('logo-filter');
  });

  it('should have white image src and no custom color as filter class when passing white color from theme palette', () => {
    render({ color: altinnTheme.altinnPalette.primary.white });

    const img = getImage();
    expect(img.src).toContain('Altinn-logo-white.svg');
    expect(img.className).not.toContain('logo-filter');
  });

  it('should have blue image src and no custom color as filter class when passing blueDark as color', () => {
    render({ color: 'blueDark' });

    const img = getImage();
    expect(img.src).toContain('Altinn-logo-blue.svg');
    expect(img.className).not.toContain('logo-filter');
  });

  it('should have blue image src and no custom color as filter class when passing blueDark color from theme palette', () => {
    render({ color: altinnTheme.altinnPalette.primary.blueDark });

    const img = getImage();
    expect(img.src).toContain('Altinn-logo-blue.svg');
    expect(img.className).not.toContain('logo-filter');
  });
});

const getImage = () =>
  screen.getByRole('img', {
    name: /altinn logo/i,
  }) as HTMLImageElement;

const render = (props: Partial<IAltinnLogoProps> = {}) => {
  const allProps = {
    color: 'white',
    ...props,
  };

  rtlRender(<AltinnLogo {...allProps} />);
};
