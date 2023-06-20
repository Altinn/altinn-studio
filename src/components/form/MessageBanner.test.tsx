import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { MessageBanner } from 'src/components/form/MessageBanner';
import { renderWithProviders } from 'src/testUtils';
import type { ValidLanguageKey } from 'src/hooks/useLanguage';

describe('MessageBanner', () => {
  const mockState = getInitialStateMock();
  const mockMessageKey: ValidLanguageKey = 'form_filler.required_description';

  it('should have grey background by default', () => {
    renderWithProviders(<MessageBanner messageKey={mockMessageKey} />, { preloadedState: mockState });

    const messageBanner = screen.getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('default');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    const regularColor = window.getComputedStyle(document.body).getPropertyValue('--colors-grey-200');
    expect(backgroundColor).toEqual(regularColor);
  });

  it('should have red background when error==true', () => {
    renderWithProviders(
      <MessageBanner
        messageKey={mockMessageKey}
        error={true}
      />,
      { preloadedState: mockState },
    );

    const messageBanner: HTMLElement = screen.getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('error');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    const errorColor = window.getComputedStyle(document.body).getPropertyValue('--colors-red-200');
    expect(backgroundColor).toEqual(errorColor);
  });
});
