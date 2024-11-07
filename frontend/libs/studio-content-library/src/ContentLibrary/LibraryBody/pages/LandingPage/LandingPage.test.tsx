import React from 'react';
import { render, screen } from '@testing-library/react';
import { LandingPage } from './LandingPage';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('LandingPage', () => {
  afterEach(jest.clearAllMocks);

  it('renders the title, description and image', () => {
    renderLandingPage();
    expect(
      screen.getByRole('heading', {
        name: textMock('app_content_library.landing_page.title'),
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_content_library.landing_page.description')),
    ).toBeInTheDocument();
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });
});

const renderLandingPage = () => {
  render(<LandingPage />);
};
