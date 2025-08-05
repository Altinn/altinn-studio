import React from 'react';
import { BreadcrumbsTaskNavigation } from './BreadcrumbsTaskNavigation';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, layoutSet, org } from '@studio/testing/testids';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: jest.fn(),
}));

jest.mock('app-development/hooks/queries', () => ({
  useAppConfigQuery: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/ui-editor',
  }),
  useNavigate: jest.fn(),
  useParams: () => ({
    org: org,
    app: app,
    layoutSet: layoutSet,
  }),
}));

describe('BreadcrumbsTaskNavigation', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useStudioEnvironmentParams as jest.Mock).mockReturnValue({ org: 'test-org', app: 'test-app' });
    (useAppConfigQuery as jest.Mock).mockReturnValue({ data: {} });
    jest.requireMock('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderBreadcrumbsTaskNavigation = () => {
    return renderWithProviders(<BreadcrumbsTaskNavigation />);
  };

  it('renders breadcrumb items correctly', () => {
    renderBreadcrumbsTaskNavigation();
    const breadcrumbList = screen.getByRole('navigation');
    const breadcrumbItems = within(breadcrumbList).getAllByRole('listitem');
    expect(breadcrumbItems).toHaveLength(2);
    expect(breadcrumbItems[0]).toHaveTextContent('ux_editor.breadcrumbs.front_page');
    expect(breadcrumbItems[1]).toHaveTextContent(layoutSet);
  });

  it('displays selectedFormLayoutSetName correctly', () => {
    renderBreadcrumbsTaskNavigation();
    expect(screen.getByText(layoutSet)).toBeInTheDocument();
  });

  it('navigates back to the front page when clicking the "Forside Utforming" breadcrumb', async () => {
    const user = userEvent.setup();
    renderBreadcrumbsTaskNavigation();
    const createLink = screen.getByText(textMock('ux_editor.breadcrumbs.front_page'));
    await user.click(createLink);
    expect(mockNavigate).toHaveBeenCalledWith('../');
  });
});
