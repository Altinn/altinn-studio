import React from 'react';
import { BreadcrumbsTaskNavigation } from './BreadcrumbsTaskNavigation';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import userEvent from '@testing-library/user-event';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: jest.fn(),
}));

jest.mock('app-development/hooks/queries', () => ({
  useAppConfigQuery: jest.fn(),
}));

jest.mock('@altinn/ux-editor/hooks', () => ({
  useAppContext: jest.fn(),
}));

describe('BreadcrumbsTaskNavigation', () => {
  beforeEach(() => {
    (useStudioEnvironmentParams as jest.Mock).mockReturnValue({
      org: 'test-org',
      app: 'test-app',
    });

    (useAppConfigQuery as jest.Mock).mockReturnValue({
      data: { serviceName: 'Test Service' },
    });

    (useAppContext as jest.Mock).mockReturnValue({
      selectedFormLayoutSetName: 'Test Layout',
      removeSelectedFormLayoutSetName: jest.fn(),
    });
  });

  it('should render the component with StudioBreadcrumbsLink name', () => {
    renderBreadcrumbsTaskNavigation();
    expect(screen.getByText('Test Service')).toBeInTheDocument();
    expect(screen.getByText('Test Layout')).toBeInTheDocument();
  });

  it('Should redirect to the UiEditor when clicking the breadcrumbs link app name', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    renderBreadcrumbsTaskNavigation();
    await user.click(screen.getByText('Test Service'));
    expect(navigate).toHaveBeenCalledWith('../' + RoutePaths.UIEditor);
  });
});

const renderBreadcrumbsTaskNavigation = () => {
  return renderWithProviders(<BreadcrumbsTaskNavigation />);
};
