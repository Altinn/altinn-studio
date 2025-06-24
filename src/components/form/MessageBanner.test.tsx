import React from 'react';

import { screen } from '@testing-library/react';

import { MessageBanner } from 'src/components/form/MessageBanner';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ValidLanguageKey } from 'src/features/language/useLanguage';

describe('MessageBanner', () => {
  const mockMessageKey: ValidLanguageKey = 'form_filler.required_description';

  it('should have grey background by default', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <MessageBanner messageKey={mockMessageKey} />,
    });

    const messageBanner = screen.getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('default');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    const regularColor = window.getComputedStyle(document.body).getPropertyValue('--ds-color-neutral-border-subtle');
    expect(backgroundColor).toEqual(regularColor);
  });

  it('should have red background when error==true', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => (
        <MessageBanner
          messageKey={mockMessageKey}
          error={true}
        />
      ),
    });

    const messageBanner: HTMLElement = screen.getByTestId('MessageBanner-container');
    expect(messageBanner).toBeInTheDocument();
    expect(messageBanner.className).toContain('error');
    const backgroundColor = window.getComputedStyle(messageBanner).backgroundColor;
    const errorColor = window.getComputedStyle(document.body).getPropertyValue('--ds-color-danger-surface-active');
    expect(backgroundColor).toEqual(errorColor);
  });
});
