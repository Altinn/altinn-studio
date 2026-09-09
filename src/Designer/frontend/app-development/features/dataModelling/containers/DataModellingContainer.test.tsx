import { screen } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import DataModelingContainer from './DataModelingContainer';
import { dataModelingContainerId } from '@studio/testing/testids';

describe('DataModelingContainer', () => {
  it('should render data modeling container', () => {
    renderWithProviders(<DataModelingContainer />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    const container = screen.getByTestId(dataModelingContainerId);
    expect(container).toBeInTheDocument();
  });
});
