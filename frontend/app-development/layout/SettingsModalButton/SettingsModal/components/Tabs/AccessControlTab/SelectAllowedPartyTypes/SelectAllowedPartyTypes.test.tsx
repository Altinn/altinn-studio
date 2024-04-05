import React from 'react';
import {
  SelectAllowedPartyTypes,
  type SelectAllowedPartyTypesProps,
} from './SelectAllowedPartyTypes';
import { mockAppMetadata } from '../../../../mocks/applicationMetadataMock';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import { act, render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
const updateAppMetadataMock = jest.fn();

const org = 'org';
const app = 'app';

const defaultProps: SelectAllowedPartyTypesProps = {
  org,
  app,
  appMetadata: mockAppMetadata,
};

describe('SelectAllowedPartyTypes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the table', () => {
    renderSelectAllowedPartyTypes();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the table header', () => {
    renderSelectAllowedPartyTypes();
    expect(screen.getByRole('columnheader')).toBeInTheDocument();
  });

  it('should render all checkboxes', () => {
    renderSelectAllowedPartyTypes();
    screen.getByRole('columnheader', {
      name: textMock('settings_modal.access_control_tab_option_all_types'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_organisation'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_sub_unit'),
    });
  });

  it('should render all checkboxes as checked when all partyTypes allowed', async () => {
    const user = userEvent.setup();
    const getAppMetadataMock = jest.fn().mockResolvedValue({
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: false,
      },
    });
    renderSelectAllowedPartyTypes({ getAppMetadata: getAppMetadataMock });
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('should call updateAppMetadataMutation with correct payload when checking all types', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();
    const allTypeCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_all_types'),
    });
    await act(() => user.click(allTypeCheckbox));
    expect(updateAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(updateAppMetadataMock).toHaveBeenCalledWith({
      org,
      app,

      ...mockAppMetadata,
      partyTypesAllowed: {
        bankruptcyEstate: true,
        organisation: true,
        person: true,
        subUnit: true,
      },
    });
  });

  it('all checkboxes should be checked by default when all partytypes are false', async () => {
    const user = userEvent.setup();
    const getAppMetadataMock = jest.fn().mockResolvedValue({
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: false,
      },
    });
    renderSelectAllowedPartyTypes({ getAppMetadata: getAppMetadataMock });
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('render the warning modal when user tries to uncheck all checkboxes, and close it', async () => {
    const user = userEvent.setup();
    const getAppMetadataMock = jest.fn().mockResolvedValue({
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: true,
      },
    });
    renderSelectAllowedPartyTypes({ getAppMetadata: getAppMetadataMock });
    const bankruptcyEstateCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    expect(bankruptcyEstateCheckbox).toBeChecked();
    await waitFor(() => user.click(bankruptcyEstateCheckbox));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(updateAppMetadataMock).not.toHaveBeenCalled();
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await act(() => user.click(closeButton));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call updateAppMetadataMutation when selecting checkbox', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();
    const checkboxes = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    await act(() => user.click(checkboxes));
    expect(updateAppMetadataMock).toHaveBeenCalledTimes(1);
  });
});

const renderSelectAllowedPartyTypes = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    getAppMetadata,
    updateAppMetadata: updateAppMetadataMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <SelectAllowedPartyTypes {...defaultProps}></SelectAllowedPartyTypes>
    </ServicesContextProvider>,
  );
};
