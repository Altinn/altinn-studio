import React from 'react';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';
import { mockAppMetadata } from '../../../../mocks/applicationMetadataMock';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import {
  act,
  render as rtlRender,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { AccessControlTab, type AccessControlTabProps } from '../AccessControlTab';
import userEvent from '@testing-library/user-event';

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
const updateAppMetadataMock = jest.fn();

const defaultProps: AccessControlTabProps = {
  org: 'org',
  app: 'app',
};

describe('SelectAllowedPartyTypes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render header for selectAllowedPartyTypes', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(
      screen.getByText(textMock('settings_modal.access_control_tab_heading')),
    ).toBeInTheDocument();
  });

  it('renders the table', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the table header', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(screen.getByRole('columnheader')).toBeInTheDocument();
  });

  it('renders the table header checkbox label', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(
      screen.getByLabelText(textMock('settings_modal.access_control_tab_option_all_types')),
    ).toBeInTheDocument();
  });

  it('renders the table body checkboxes labels', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(
      screen.getByLabelText(textMock('settings_modal.access_control_tab_option_bankruptcy_estate')),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('settings_modal.access_control_tab_option_organisation')),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('settings_modal.access_control_tab_option_person')),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('settings_modal.access_control_tab_option_sub_unit')),
    ).toBeInTheDocument();
  });

  it('should render all checkboxes', async () => {
    await resolveAndWaitForSpinnerToDisappear();
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

  it('should render all checkboxes as checked when applicationMetadata contains all partyTypes allowed', async () => {
    const getAppMetadataMock = jest.fn().mockResolvedValue({
      ...mockAppMetadata,
      partyTypesAllowed: {
        bankruptcyEstate: true,
        organisation: true,
        person: true,
        subUnit: true,
      },
    });
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata: getAppMetadataMock });
    const checkboxes = screen.queryAllByRole('checkbox');
    checkboxes.forEach((c) => expect(c).toBeChecked());
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
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata: getAppMetadataMock });
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
    await resolveAndWaitForSpinnerToDisappear();
    const checkboxes = screen.getByRole('checkbox', {
      name: textMock('settings_modal.access_control_tab_option_person'),
    });
    await act(() => user.click(checkboxes));
    expect(updateAppMetadataMock).toHaveBeenCalledTimes(1);
  });
});

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
  render(queries);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
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
      <AccessControlTab {...defaultProps}>
        <SelectAllowedPartyTypes {...defaultProps}></SelectAllowedPartyTypes>
      </AccessControlTab>
    </ServicesContextProvider>,
  );
};
