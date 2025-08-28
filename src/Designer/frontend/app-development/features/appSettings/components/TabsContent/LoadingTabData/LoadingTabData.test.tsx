import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingTabData } from './LoadingTabData';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('LoadingTabData', () => {
  afterEach(jest.clearAllMocks);

  it('displays the spinner when the component loads', () => {
    render(<LoadingTabData />);

    const loadingText = screen.getByText(textMock('app_settings.loading_content'));
    expect(loadingText).toBeInTheDocument();
  });
});
