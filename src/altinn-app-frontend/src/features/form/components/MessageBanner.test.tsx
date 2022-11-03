import * as React from 'react';

import { render } from '@testing-library/react';

import MessageBanner from 'src/features/form/components/MessageBanner';

import { AltinnAppTheme } from 'altinn-shared/theme';
import type { ILanguage } from 'altinn-shared/types';

describe('MessageBanner', () => {
  const descriptionText = 'Obligatoriske felter er merket med *';
  const mockLanguage: ILanguage = {
    form_filler: {
      required_description: descriptionText,
    },
  };
  const mockMessageKey = 'form_filler.required_description';

  it('should have grey background by default', () => {
    const { getByTestId } = render(
      <MessageBanner
        language={mockLanguage}
        messageKey={mockMessageKey}
      />,
    );

    const messageBanner = getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('default');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    expect(backgroundColor).toEqual(convertToRgb(AltinnAppTheme.altinnPalette.primary.greyLight));
  });

  it('should have red background when error==true', () => {
    const { getByTestId } = render(
      <MessageBanner
        language={mockLanguage}
        messageKey={mockMessageKey}
        error={true}
      />,
    );

    const messageBanner: HTMLElement = getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('error');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    expect(backgroundColor).toEqual(convertToRgb(AltinnAppTheme.altinnPalette.primary.redLight));
  });
});

const convertToRgb = (hexValue: string): string => {
  const aRgbHex = hexValue.replace('#', '').match(/.{1,2}/g);
  if (!aRgbHex) {
    return '';
  }

  const aRgb = [parseInt(aRgbHex[0], 16), parseInt(aRgbHex[1], 16), parseInt(aRgbHex[2], 16)];
  return `rgb(${aRgb[0]}, ${aRgb[1]}, ${aRgb[2]})`;
};
