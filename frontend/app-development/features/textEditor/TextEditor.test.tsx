import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { screen } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';

describe('TextEditor', () => {
  it('should render the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });
});
