import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingTabData } from './LoadingTabData';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

describe('LoadingTabData', () => {
  afterEach(jest.clearAllMocks);

  it('displays the text when the component is loaded', () => {
    render(<LoadingTabData />);

    const loadingText = screen.getByTitle(textMock('settings_modal.loading_content'));
    expect(loadingText).toBeInTheDocument();
  });
});
