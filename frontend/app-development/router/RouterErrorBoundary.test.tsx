import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './PageRouterErrorBoundry';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('PageRouterErrorBoundary', () => {
  it('should display generic error title and message', () => {
    render(<ErrorBoundary />);

    const title = screen.getByRole('heading', {
      level: 1,
      name: textMock('general.page_error_title'),
    });
    expect(title).toBeInTheDocument();

    const message = screen.getByText(textMock('general.page_error_message'));
    expect(message).toBeInTheDocument();
  });
});
