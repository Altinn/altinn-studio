import React from 'react';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { SetupTab, SetupTabProps } from './SetupTab';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { mockAppMetadata } from '../../../mocks/applicationMetadataMock';

const mockOrg: string = 'testOrg';
const mockApp: string = 'testApp';

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, unknown, ApplicationMetadata, unknown>);

const defaultProps: SetupTabProps = {
  org: mockOrg,
  app: mockApp,
};

describe('SetupTab Component', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches appMetadata on mount', () => {
    render();
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the "getAppMetadata" query', async () => {
    const errorMessage = 'error-message-test';
    render({
      getAppMetadata: () => Promise.reject({ message: errorMessage }),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('loads the valid from data with correct values', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const validFromDate = mockAppMetadata.validFrom.split('T')[0];
    const validFromTime = mockAppMetadata.validFrom.split('T')[1].substring(0, 5);
    const validFromDateInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_from_label'),
    );
    const validFromTimeInput = screen.getAllByLabelText(
      textMock('settings_modal.setup_tab_time_label'),
    )[0];

    expect(validFromDateInput).toHaveValue(validFromDate);
    expect(validFromTimeInput).toHaveValue(validFromTime);
  });
  it('calls the "updateAppMetadataMutation" function when updating date and time in validFrom', () => {});

  it('loads the valid to data with correct values', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const validToDate = mockAppMetadata.validTo.split('T')[0];
    const validToTime = mockAppMetadata.validTo.split('T')[1].substring(0, 5);
    const validToDateInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );
    const validToTimeInput = screen.getAllByLabelText(
      textMock('settings_modal.setup_tab_time_label'),
    )[1];

    expect(validToDateInput).toHaveValue(validToDate);
    expect(validToTimeInput).toHaveValue(validToTime);
  });

  it.only('does not display the valid to components when validTo is undefined', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getAppMetadata: () => Promise.resolve({ ...mockAppMetadata, validTo: undefined }),
    });

    const validToDateInput = screen.queryByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );
    expect(validToDateInput).not.toBeInTheDocument();
  });
  it('calls the "updateAppMetadataMutation" function when updating date and time in validTo', () => {});

  it('displays an error message when validTo is an earlier date than validFrom', () => {});

  it('loads the "autoDeleteOnProcessEnd" value correctly', () => {});
  it('calls the "updateAppMetadataMutation" function when updating "autoDeleteOnProcessEnd" switch', () => {});

  it('loads the "messageBoxConfig.hideSettings.hideAlways" value correctly', () => {});
  it('calls the "updateAppMetadataMutation" function when updating "messageBoxConfig.hideSettings.hideAlways" switch', () => {});

  it('loads the "copyInstanceSettings.enabled" value correctly', () => {});
  it('calls the "updateAppMetadataMutation" function when updating "copyInstanceSettings.enabled" switch', () => {});

  it('loads the "onEntry.show" value correctly', () => {});
  it('calls the "updateAppMetadataMutation" function when updating "onEntry.show" switch', () => {});

  it('calls onSave when date value is changed', async () => {
    render(<SetupTab org={mockOrg} app={mockApp} />);

    const validFromInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_from_label'),
    );

    fireEvent.change(validFromInput, { target: { value: '2023-12-13' } });

    await waitFor(() => {
      expect(mockAppMetadataMutation).toHaveBeenCalledWith({
        ...mockAppMetadata,
        validFrom: '2023-12-13T12:00:00.000Z',
      });
    });
  });

  it('calls onSave when switch is toggled', async () => {
    render(<SetupTab org={mockOrg} app={mockApp} />);

    const autoDeleteSwitch = screen.getByText(
      textMock('settings_modal.setup_tab_switch_autoDeleteOnProcessEnd'),
    );

    fireEvent.click(autoDeleteSwitch);

    await waitFor(() => {
      expect(mockAppMetadataMutation).toHaveBeenCalledWith({
        ...mockAppMetadata,
        autoDeleteOnProcessEnd: false,
      });
    });
  });
});

const resolveAndWaitForSpinnerToDisappear = async (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<SetupTabProps> = {},
) => {
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));

  render(queries, props);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<SetupTabProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAppMetadata,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <SetupTab {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
