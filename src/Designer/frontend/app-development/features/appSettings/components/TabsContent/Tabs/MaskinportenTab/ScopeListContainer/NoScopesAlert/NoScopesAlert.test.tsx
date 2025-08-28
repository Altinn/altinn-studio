import React from 'react';
import { render, screen } from '@testing-library/react';
import { NoScopesAlert } from './NoScopesAlert';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';

describe('NoScopesAlert', () => {
  it('should render an alert with correct content', () => {
    renderNoScopesAlert();

    expect(
      screen.getByRole('heading', {
        name: textMock('app_settings.maskinporten_no_scopes_available_title'),
        level: 4,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_settings.maskinporten_no_scopes_available_description')),
    ).toBeInTheDocument();
  });

  it('should render a link with the correct href', () => {
    const href = new GetInTouchWith(new EmailContactProvider());
    renderNoScopesAlert();

    const link = screen.getByRole('link', {
      name: textMock('app_settings.maskinporten_no_scopes_available_link'),
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', href.url('serviceOwner'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

const renderNoScopesAlert = () => {
  return render(<NoScopesAlert />);
};
