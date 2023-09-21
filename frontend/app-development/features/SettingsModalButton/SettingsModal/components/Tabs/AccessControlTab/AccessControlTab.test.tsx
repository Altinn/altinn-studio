import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { AccessControlTab, AccessControlTabProps } from './AccessControlTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import type { ApplicationMetadata, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockPartyTypesAllowed: PartyTypesAllowed = {
  bankruptcyEstate: true,
  organisation: false,
  person: false,
  subUnit: false,
};

const mockAppMetadata: ApplicationMetadata = {
  id: 'mockId',
  org: mockOrg,
  partyTypesAllowed: mockPartyTypesAllowed,
};

jest.mock('../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, unknown, ApplicationMetadata, unknown>);

describe('AccessControlTab', () => {
  const user = userEvent.setup();

  afterEach(jest.clearAllMocks);

  const defaultProps: AccessControlTabProps = {
    appMetadata: mockAppMetadata,
    org: mockOrg,
    app: mockApp,
  };

  it('should render all checkboxes as unchecked when applicationMetadata des not contain partyTypes allowed', () => {
    render({}, createQueryClientMock(), {
      ...defaultProps,
      appMetadata: { ...mockAppMetadata, partyTypesAllowed: null },
    });

    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((c) => expect(c).not.toBeChecked());
  });

  it('should render all checkboxes with the correct values based on the party types allowed', () => {
    render({}, createQueryClientMock(), defaultProps);

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
    render({}, createQueryClientMock(), defaultProps);

    const organisationCheckboxBefore = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    expect(organisationCheckboxBefore).not.toBeChecked();

    await act(() => user.click(organisationCheckboxBefore));

    const organisationCheckboxAfter = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    expect(organisationCheckboxAfter).toBeChecked();
  });

  it('calles saving function when checboxgroup is blurred', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const organisationCheckboxBefore = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    await act(() => user.click(organisationCheckboxBefore));
    await act(() => user.tab());

    expect(updateAppMetadataMutation).toBeCalledTimes(1);
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
  props: AccessControlTabProps
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <AccessControlTab {...props} />
    </ServicesContextProvider>
  );
};
