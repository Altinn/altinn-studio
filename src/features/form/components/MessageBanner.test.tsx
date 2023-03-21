import React from 'react';

import { render, screen } from '@testing-library/react';

import { MessageBanner } from 'src/features/form/components/MessageBanner';
import type { ILanguage } from 'src/types/shared';

describe('MessageBanner', () => {
  const descriptionText = 'Obligatoriske felter er merket med *';
  const mockLanguage: ILanguage = {
    form_filler: {
      required_description: descriptionText,
    },
  };
  const mockMessageKey = 'form_filler.required_description';

  it('should have grey background by default', () => {
    render(
      <MessageBanner
        language={mockLanguage}
        messageKey={mockMessageKey}
      />,
    );

    const messageBanner = screen.getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('default');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    const regularColor = window.getComputedStyle(document.body).getPropertyValue('--colors-grey-200');
    expect(backgroundColor).toEqual(regularColor);
  });

  it('should have red background when error==true', () => {
    render(
      <MessageBanner
        language={mockLanguage}
        messageKey={mockMessageKey}
        error={true}
      />,
    );

    const messageBanner: HTMLElement = screen.getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('error');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    const errorColor = window.getComputedStyle(document.body).getPropertyValue('--colors-red-200');
    expect(backgroundColor).toEqual(errorColor);
  });
});
