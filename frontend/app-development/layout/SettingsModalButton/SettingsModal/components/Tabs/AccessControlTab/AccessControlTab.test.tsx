import React from 'react';
import {
  act,
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { AccessControlTab, AccessControlTabProps } from './AccessControlTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { mockAppMetadata } from '../../../mocks/applicationMetadataMock';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, Error, ApplicationMetadata, unknown>);

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));

const defaultProps: AccessControlTabProps = {
  org: mockOrg,
  app: mockApp,
};

describe('AccessControlTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches appMetadata on mount', () => {
    render();
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the getAppMetadata query', async () => {
    const errorMessage = 'error-message-test';
    render({}, { getAppMetadata: () => Promise.reject({ message: errorMessage }) });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render all checkboxes as unchecked when applicationMetadata des not contain partyTypes allowed', async () => {
    getAppMetadata.mockImplementation(() =>
      Promise.resolve({ ...mockAppMetadata, partyTypesAllowed: null }),
    );
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((c) => expect(c).not.toBeChecked());
  });

  it('should render all checkboxes with the correct values based on the party types allowed', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const bankruptcyEstateCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    expect(bankruptcyEstateCheckbox).toBeChecked();

    const organisationCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    expect(organisationCheckbox).not.toBeChecked();

    const personCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    expect(personCheckbox).not.toBeChecked();

    const subUnitCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_sub_unit'),
    });
    expect(subUnitCheckbox).not.toBeChecked();
  });

  it('handles checkbox changes', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const organisationCheckboxBefore = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    expect(organisationCheckboxBefore).not.toBeChecked();

    await act(() => user.click(organisationCheckboxBefore));

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
    expect(updateAppMetadataMutation).toHaveBeenCalledWith({
      ...mockAppMetadata,
      partyTypesAllowed: {
        bankruptcyEstate: true,
        organisation: true,
        person: false,
        subUnit: false,
      },
    });
  });
});

const resolveAndWaitForSpinnerToDisappear = async (props: Partial<AccessControlTabProps> = {}) => {
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
  render(props);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
  props: Partial<AccessControlTabProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAppMetadata,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AccessControlTab {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};
