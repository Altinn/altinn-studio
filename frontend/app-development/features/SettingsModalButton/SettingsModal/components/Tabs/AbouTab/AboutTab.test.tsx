import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { AboutTab, AboutTabProps } from './AboutTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { AppConfig } from 'app-shared/types/AppConfig';
import userEvent from '@testing-library/user-event';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { mockRepository1, mockRepository2 } from '../../../mocks/repositoryMock';
import { mockAppConfig } from '../../../mocks/appConfigMock';
import { formatDateToDateAndTimeString } from 'app-development/utils/dateUtils';

const mockApp: string = 'app';
const mockOrg: string = 'org';
const mockNewText: string = 'test';
const mockCreatedBy: string = 'Mock Mockesen';

jest.mock('../../../../../../hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, unknown, AppConfig, unknown>);

describe('AboutTab', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const defaultProps: AboutTabProps = {
    appConfig: mockAppConfig,
    org: mockOrg,
    app: mockApp,
    repository: mockRepository1,
    createdBy: mockCreatedBy,
  };

  it('displays the "repo" input as readonly', () => {
    render({}, createQueryClientMock(), defaultProps);

    const repoNameInput = screen.getByLabelText(textMock('settings_modal.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "name" input field, and updates the value on change', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const appName = screen.getByLabelText(textMock('settings_modal.about_tab_name_label'));
    expect(appName).toHaveValue(mockAppConfig.serviceName);

    await act(() => user.type(appName, mockNewText));

    expect(appName).toHaveValue(`${mockAppConfig.serviceName}${mockNewText}`);
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const altId = screen.getByLabelText(textMock('settings_modal.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    await act(() => user.type(altId, mockNewText));

    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${mockNewText}`);
  });

  it('should update app config when saving', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const altId = screen.getByLabelText(textMock('settings_modal.about_tab_alt_id_label'));
    await act(() => user.type(altId, mockNewText));
    await act(() => user.tab());

    expect(updateAppConfigMutation).toHaveBeenCalledTimes(1);
  });

  it('displays owners full name when it is set', () => {
    render({}, createQueryClientMock(), defaultProps);
    expect(screen.getByText(mockRepository1.owner.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockRepository1.owner.login)).not.toBeInTheDocument();
  });

  it('displays owners login name when full name is not set', () => {
    render({}, createQueryClientMock(), { ...defaultProps, repository: mockRepository2 });
    expect(screen.queryByText(mockRepository1.owner.full_name)).not.toBeInTheDocument();
    expect(screen.getByText(mockRepository1.owner.login)).toBeInTheDocument();
  });

  it.only('displays the created date mapped correctly', () => {
    render({}, createQueryClientMock(), defaultProps);

    const formatedDateString: string = formatDateToDateAndTimeString(mockRepository1.created_at);

    expect(
      screen.getByText(
        textMock('settings_modal.about_tab_created_date', { date: formatedDateString })
      )
    ).toBeInTheDocument();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
  props: AboutTabProps
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AboutTab {...props} />
    </ServicesContextProvider>
  );
};
