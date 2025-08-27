import React from 'react';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';
import type { SelectAllowedPartyTypesProps } from './SelectAllowedPartyTypes';
import { mockAppMetadata } from '../../../../../../../test/applicationMetadataMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from '../../../../../../../test/mocks';

describe('SelectAllowedPartyTypes', () => {
  afterEach(jest.clearAllMocks);

  it('renders the table', () => {
    renderSelectAllowedPartyTypes();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the table header', () => {
    renderSelectAllowedPartyTypes();
    expect(
      screen.getByRole('columnheader', {
        name: textMock('app_settings.access_control_tab_option_all_types'),
      }),
    ).toBeInTheDocument();
  });

  it('should render all checkboxes', () => {
    renderSelectAllowedPartyTypes();
    expect(
      getCheckbox(textMock('app_settings.access_control_tab_option_all_types')),
    ).toBeInTheDocument();
    expect(
      getCheckbox(textMock('app_settings.access_control_tab_option_bankruptcy_estate')),
    ).toBeInTheDocument();
    expect(
      getCheckbox(textMock('app_settings.access_control_tab_option_organisation')),
    ).toBeInTheDocument();
    expect(
      getCheckbox(textMock('app_settings.access_control_tab_option_person')),
    ).toBeInTheDocument();
    expect(
      getCheckbox(textMock('app_settings.access_control_tab_option_sub_unit')),
    ).toBeInTheDocument();
  });

  it('shows the error message when user unchecks all checkboxes', async () => {
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
    renderSelectAllowedPartyTypes({ componentProps: { appMetadata: appMetadataMock } });
    const bankruptcyEstateCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_bankruptcy_estate'),
    );
    expect(bankruptcyEstateCheckbox).toBeChecked();
    await user.click(bankruptcyEstateCheckbox);

    expect(
      getText(textMock('app_settings.access_control_tab_option_choose_type_modal_message')),
    ).toBeInTheDocument();
  });

  it('should check all checkboxes when all-types checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();
    const allTypeCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_all_types'),
    );
    await user.click(allTypeCheckbox);
    const checkboxes = getAllCheckboxes();
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('should call updateAppMetadataMutation with correct payload when clicking save button', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();

    const allTypeCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_all_types'),
    );
    await user.click(allTypeCheckbox);

    const saveButton = getButton(textMock('app_settings.access_control_tab_save_options'));
    await user.click(saveButton);

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

  it('should display a success toast when the update is successful', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();

    const allTypeCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_all_types'),
    );
    await user.click(allTypeCheckbox);

    const saveButton = getButton(textMock('app_settings.access_control_tab_save_options'));
    await user.click(saveButton);

    const successMessage = textMock('app_settings.access_control_tab_save_options_success_message');
    expect(getText(successMessage)).toBeInTheDocument();
  });

  it('should display an error toast when the update fails', async () => {
    const user = userEvent.setup();
    const updateAppMetadata = jest.fn().mockImplementation(() => Promise.reject({ response: {} }));
    renderSelectAllowedPartyTypes({ queries: { updateAppMetadata } });

    const allTypeCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_all_types'),
    );
    await user.click(allTypeCheckbox);

    const saveButton = getButton(textMock('app_settings.access_control_tab_save_options'));
    await user.click(saveButton);

    const successMessage = textMock('app_settings.access_control_tab_save_options_error_message');
    expect(getText(successMessage)).toBeInTheDocument();
  });

  it('should reset checkboxes to initial values when reset button is clicked', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();

    const randomcheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_bankruptcy_estate'),
    );
    expect(randomcheckbox).toBeChecked();
    await user.click(randomcheckbox);
    expect(randomcheckbox).not.toBeChecked();

    const resetButton = getButton(textMock('app_settings.access_control_tab_reset_options'));
    await user.click(resetButton);
    expect(randomcheckbox).toBeChecked();
  });

  it('should disable save button when checkboxes are not changed from initial values', async () => {
    const user = userEvent.setup();
    renderSelectAllowedPartyTypes();

    const saveButton = getButton(textMock('app_settings.access_control_tab_save_options'));
    expect(saveButton).toBeDisabled();

    const allTypeCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_all_types'),
    );
    await user.click(allTypeCheckbox);
    expect(saveButton).not.toBeDisabled();

    await user.click(allTypeCheckbox);
    expect(saveButton).toBeDisabled();
  });

  it('should disable reset button when checkboxes are not changed from initial values', async () => {
    const user = userEvent.setup();
    const appMetadataMock = {
      ...mockAppMetadata,
      partyTypesAllowed: {
        person: true,
        organisation: true,
        subUnit: true,
        bankruptcyEstate: true,
      },
    };
    renderSelectAllowedPartyTypes({ componentProps: { appMetadata: appMetadataMock } });

    const resetButton = getButton(textMock('app_settings.access_control_tab_reset_options'));
    expect(resetButton).toBeDisabled();

    const allTypeCheckbox = getCheckbox(
      textMock('app_settings.access_control_tab_option_all_types'),
    );
    await user.click(allTypeCheckbox);
    expect(resetButton).not.toBeDisabled();

    await user.click(allTypeCheckbox);
    expect(resetButton).toBeDisabled();
  });
});

const defaultProps: SelectAllowedPartyTypesProps = {
  appMetadata: mockAppMetadata,
};

type Props = {
  componentProps: Partial<SelectAllowedPartyTypesProps>;
  queries: Partial<ServicesContextProps>;
};

const renderSelectAllowedPartyTypes = (props: Partial<Props> = {}) => {
  const { componentProps, queries } = props;
  const queryClient: QueryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(
    allQueries,
    queryClient,
  )(<SelectAllowedPartyTypes {...defaultProps} {...componentProps} />);
};

const getCheckbox = (name: string): HTMLInputElement => screen.getByRole('checkbox', { name });
const getAllCheckboxes = (): HTMLInputElement[] => screen.getAllByRole('checkbox');
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
