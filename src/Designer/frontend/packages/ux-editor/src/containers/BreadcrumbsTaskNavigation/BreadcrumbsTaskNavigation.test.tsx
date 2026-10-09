import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BreadcrumbsTaskNavigation } from './BreadcrumbsTaskNavigation';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, layoutSet, org } from '@studio/testing/testids';

vi.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: vi.fn(),
}));

vi.mock('app-development/hooks/queries', () => ({
  useAppConfigQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useLocation: () => ({
    pathname: '/ui-editor',
  }),
  useNavigate: vi.fn(),
  useParams: () => ({
    org: org,
    app: app,
    layoutSet: layoutSet,
  }),
}));

describe('BreadcrumbsTaskNavigation', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    (useStudioEnvironmentParams as Mock).mockReturnValue({ org: 'test-org', app: 'test-app' });
    (useAppConfigQuery as Mock).mockReturnValue({ data: {} });
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderBreadcrumbsTaskNavigation = () => {
    return renderWithProviders(<BreadcrumbsTaskNavigation />);
  };

  it('renders breadcrumb items correctly', () => {
    renderBreadcrumbsTaskNavigation();
    // const breadcrumbList = screen.getByRole('navigation'); // ds-breadcrumbs adds and removes navigation role based on screen size, so getting the list role directly is more stable for testing
    const breadcrumbList = screen.getByRole('list'); //
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
