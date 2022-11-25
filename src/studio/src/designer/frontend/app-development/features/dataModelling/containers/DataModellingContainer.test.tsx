import { APP_DEVELOPMENT_BASENAME } from '../../../../constants';
import React from 'react';
import { renderWithProviders } from '../../../test/testUtils';
import DataModellingContainer from './DataModellingContainer';

describe('DataModellingContainer', () => {
  it('should render data modelling container', () => {
    const utils = renderWithProviders(<DataModellingContainer language={{}} />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    const container = utils.getByTestId('data-modelling-container');
    expect(container).toBeInTheDocument();
  });
});
