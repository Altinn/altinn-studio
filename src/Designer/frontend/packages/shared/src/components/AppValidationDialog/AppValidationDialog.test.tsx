import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { AppValidationDialog } from './AppValidationDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock, queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const org = 'test-org';
const app = 'test-app';
const initialPath = `/test-org/test-app/overview`;

function LocationDisplay(): React.ReactElement {
  const location = useLocation();
  return (
    <div data-testid='location-display'>
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderAppValidationDialog(
  validationData: {
    isValid?: boolean;
    errors?: Record<string, string[]>;
  } | null,
) {
  const queryClient = createQueryClientMock();
  if (validationData !== null) {
    queryClient.setQueryData([QueryKey.AppValidation, org, app], {
      isValid: false,
      ...validationData,
    });
  } else {
    queryClient.setQueryData([QueryKey.AppValidation, org, app], {});
  }

  return render(
    <TestAppRouter initialPath={initialPath} pathTemplate='/:org/:app/*'>
      <ServicesContextProvider
        {...queriesMock}
        client={queryClient}
        clientConfig={queryClientConfigMock}
      >
        <LocationDisplay />
        <AppValidationDialog />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
}

describe('AppValidationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render error summary when there are no validation errors', () => {
    renderAppValidationDialog(null);
    expect(
      screen.queryByText(textMock('app_validation.app_metadata.errors_need_fixing')),
    ).not.toBeInTheDocument();
  });

  it('renders error summary item and navigates to app-settings with focus when link is clicked', async () => {
    renderAppValidationDialog({
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
    const locationDisplay = screen.getByTestId('location-display');
    expect(locationDisplay).toHaveTextContent(`/${org}/${app}/app-settings`);
    expect(locationDisplay).toHaveTextContent('?currentTab=about&focus=title-nn');
  });
});
