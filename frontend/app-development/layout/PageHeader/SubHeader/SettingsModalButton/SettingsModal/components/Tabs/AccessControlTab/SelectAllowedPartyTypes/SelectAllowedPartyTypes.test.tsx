import React from 'react';
import {
  SelectAllowedPartyTypes,
  type SelectAllowedPartyTypesProps,
} from './SelectAllowedPartyTypes';
import { mockAppMetadata } from '../../../../mocks/applicationMetadataMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

const defaultProps: SelectAllowedPartyTypesProps = {
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

  it('render the warning modal when user tries to uncheck all checkboxes, and close it', async () => {
    const user = userEvent.setup();
    const appMetadataMock = {
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: true,
      },
    };
    renderSelectAllowedPartyTypes({ appMetadata: appMetadataMock });
    const bankruptcyEstateCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_bankruptcy_estate'),
    });
    expect(bankruptcyEstateCheckbox).toBeChecked();
    await waitFor(() => user.click(bankruptcyEstateCheckbox));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(queriesMock.updateAppMetadata).not.toHaveBeenCalled();
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should check all checkboxes when all-types checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();
    const allTypeCheckbox = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_all_types'),
    });
    await user.click(allTypeCheckbox);
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
    await user.click(allTypeCheckbox);
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledWith(org, app, {
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: true,
        organisation: true,
        subUnit: true,
        bankruptcyEstate: true,
      },
    });
  });

  it('all checkboxes should be checked by default when all partytypes are false', async () => {
    const appMetadataMock = {
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: false,
        organisation: false,
        subUnit: false,
        bankruptcyEstate: false,
      },
    };
    renderSelectAllowedPartyTypes({ appMetadata: appMetadataMock });
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('should call updateAppMetadataMutation when selecting checkbox', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();
    const checkboxes = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    await user.click(checkboxes);
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledTimes(1);
  });
});

const renderSelectAllowedPartyTypes = (props: Partial<SelectAllowedPartyTypesProps> = {}) => {
  const queryClient: QueryClient = createQueryClientMock();
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <SelectAllowedPartyTypes {...defaultProps} {...props}></SelectAllowedPartyTypes>
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
