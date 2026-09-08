import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { AppValidationDialog } from './AppValidationDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock, queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appValidationAreaId } from '@studio/testing/testids';
import type { AppValidationArea } from 'app-shared/utils/appValidationUtils';

const org = 'test-org';
const app = 'test-app';
const initialPath = `/${org}/${app}/overview`;

function getArea(area: AppValidationArea): HTMLElement {
  return screen.getByTestId(appValidationAreaId(area));
}

function renderAppValidationDialog(validationData: {
  isValid?: boolean;
  errors?: Record<string, string[]>;
}) {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppValidation, org, app], validationData);
  const router = createMemoryRouter(
    [
      {
        path: '/:org/:app/*',
        element: (
          <ServicesContextProvider
            {...queriesMock}
            client={queryClient}
            clientConfig={queryClientConfigMock}
          >
            <AppValidationDialog />
          </ServicesContextProvider>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(<RouterProvider router={router} />);
  return { router };
}

describe('AppValidationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog with heading and updated-at paragraph', () => {
    renderAppValidationDialog({});
    expect(screen.getByText(/app_validation\.heading/)).toBeInTheDocument();
    expect(screen.getByText(/general\.updatedAt/)).toBeInTheDocument();
  });

  it('renders a details section only for the areas with findings', () => {
    renderAppValidationDialog({
      isValid: false,
      errors: { 'title.nn': ['required'], 'unknown.key': ['some-error'] },
    });
    expect(screen.getByText(textMock('app_settings.heading'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_validation.area_other'))).toBeInTheDocument();
    expect(screen.queryByText(textMock('top_menu.create'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('top_menu.data_model'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('top_menu.texts'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('top_menu.process_editor'))).not.toBeInTheDocument();
  });

  it('does not render error summary when there are no validation errors', () => {
    renderAppValidationDialog({});
    expect(screen.queryByText(textMock('app_validation.errors_lead'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('app_validation.warnings_lead'))).not.toBeInTheDocument();
    expect(screen.getByText(textMock('app_validation.no_issues'))).toBeInTheDocument();
  });

  it('renders error and warning counts', () => {
    renderAppValidationDialog({
      isValid: false,
      errors: { 'title.nn': ['required'], 'title.en': ['required'] },
    });
    expect(screen.getByText(textMock('app_validation.errors_tag'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_validation.warnings_tag'))).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('app_validation.error_count', { count: 1 })),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('app_validation.warning_count', { count: 1 })),
    ).toBeInTheDocument();
  });

  it('renders app settings errors inside the settings area', () => {
    renderAppValidationDialog({
      isValid: false,
      errors: { 'title.nn': ['required'] },
    });
    const settingsArea = getArea('settings');
    expect(settingsArea).toHaveTextContent(textMock('app_validation.errors_lead'));
    expect(settingsArea).toHaveTextContent(
      textMock('app_validation.app_metadata.title.nn.required'),
    );
  });

  it('renders unknown error keys inside the other area', () => {
    renderAppValidationDialog({
      isValid: false,
      errors: { 'unknown.key': ['some-error'] },
    });
    const otherArea = getArea('other');
    expect(otherArea).toHaveTextContent(textMock('unknown.key'));
  });

  it('renders error summary item and navigates to app-settings with focus when link is clicked', async () => {
    const { router } = renderAppValidationDialog({
      isValid: false,
      errors: { 'title.nn': ['required'] },
    });
    const link = screen.getByText(textMock('app_validation.app_metadata.title.nn.required'));
    const expectedHref = `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/app-settings?currentTab=about&focus=title-nn`;
    expect(link).toHaveAttribute('href', expectedHref);
    const user = userEvent.setup();
    await user.click(link);
    expect(router.state.location.pathname).toBe(`/${org}/${app}/app-settings`);
    expect(router.state.location.search).toBe('?currentTab=about&focus=title-nn');
  });

  it('renders contact point index error with correct anchor and message', () => {
    renderAppValidationDialog({
      isValid: false,
      errors: { 'contactPoints[2]': ['incomplete'] },
    });
    const link = screen.getByText(
      textMock('app_validation.app_metadata.contact_points.incomplete'),
    );
    const expectedHref = `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/app-settings?currentTab=about&focus=contactPoints-2`;
    expect(link).toHaveAttribute('href', expectedHref);
  });

  it('falls back to error key as message and empty focus for unknown fields', () => {
    renderAppValidationDialog({
      isValid: false,
      errors: { 'unknown.key': ['some-error'] },
    });
    const link = screen.getByText(textMock('unknown.key'));
    const expectedHref = `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/app-settings?currentTab=about&focus=`;
    expect(link).toHaveAttribute('href', expectedHref);
  });
});
