import React from 'react';
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

const org = 'test-org';
const app = 'test-app';
const initialPath = `/${org}/${app}/overview`;

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

  it('does not render error summary when there are no validation errors', () => {
    renderAppValidationDialog({});
    expect(
      screen.queryByText(textMock('app_validation.app_metadata.errors_need_fixing')),
    ).not.toBeInTheDocument();
  });

  it('renders error summary item and navigates to app-settings with focus when link is clicked', async () => {
    const { router } = renderAppValidationDialog({
      isValid: false,
      errors: { 'title.nn': ['required'] },
    });
    expect(
      screen.getByText(textMock('app_validation.app_metadata.errors_need_fixing')),
    ).toBeInTheDocument();
    const link = screen.getByText(textMock('app_validation.app_metadata.title.nn.required'));
    const expectedHref = `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/app-settings?currentTab=about&focus=title-nn`;
    expect(link).toHaveAttribute('href', expectedHref);
    const user = userEvent.setup();
    await user.click(link);
    expect(router.state.location.pathname).toBe(`/${org}/${app}/app-settings`);
    expect(router.state.location.search).toBe('?currentTab=about&focus=title-nn');
  });
});
