import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';

const mockServiceInformation = {
  error: null,
};

describe('TextEditor', () => {
/*   it('should render the spinner', async () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  }); */

  it('should render the component', async () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
      preloadedState: {
        serviceInformation: mockServiceInformation,
      },
    });
    await waitFor(() => expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument());
  });
});
