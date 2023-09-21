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

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockAppConfig: AppConfig = {
  repositoryName: 'test',
  serviceName: 'test',
  serviceId: '',
  serviceDescription: '',
};

const mockNewText: string = 'test';

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
