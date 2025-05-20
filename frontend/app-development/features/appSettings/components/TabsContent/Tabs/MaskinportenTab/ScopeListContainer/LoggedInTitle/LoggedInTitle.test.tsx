import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoggedInTitle } from './LoggedInTitle';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('LoggedInTitle', () => {
  it('should render a heading with the correct text', () => {
    render(<LoggedInTitle />);

    const heading = screen.getByRole('heading', {
      name: textMock('app_settings.maskinporten_tab_available_scopes_title'),
      level: 3,
    });
    expect(heading).toBeInTheDocument();
  });
});
