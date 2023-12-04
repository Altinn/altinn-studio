import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotFoundPage } from './NotFoundPage';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('NotFoundPage', () => {
  it('renders correctly', () => {
    render(<NotFoundPage />);

    const heading = screen.getByRole('heading', {
      name: textMock('not_found_page.heading'),
      level: 1,
    });
    expect(heading).toBeInTheDocument();

    const paragraph = screen.getByText(textMock('not_found_page.text'));
    expect(paragraph).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: textMock('not_found_page.redirect_to_dashboard'),
    });
    expect(link).toBeInTheDocument();

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();

    expect(image.tagName).toBe('IMG');
  });
});
