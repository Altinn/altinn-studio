import React from 'react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import DataModellingContainer from './DataModellingContainer';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation() }),
);

describe('DataModellingContainer', () => {
  it('should render data modelling container', () => {
    const utils = renderWithProviders(<DataModellingContainer />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    const container = utils.getByTestId('data-modelling-container');
    expect(container).toBeInTheDocument();
  });
});
