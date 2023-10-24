import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { SetupTabContent, SetupTabContentProps } from './SetupTabContent';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { UseMutationResult } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { mockAppMetadata } from '../../../../mocks/applicationMetadataMock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const mockOrg: string = 'testOrg';
const mockApp: string = 'testApp';
const mockValidFromNew: string = '2023-09-13T12:00:00Z';
const mockValidToNew: string = '2023-08-13T12:00:00Z';

jest.mock('../../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, unknown, ApplicationMetadata, unknown>);

const defaultProps: SetupTabContentProps = {
  appMetadata: mockAppMetadata,
  org: mockOrg,
  app: mockApp,
};

describe('SetupTabContent', () => {
  afterEach(jest.clearAllMocks);

  it('loads the valid from data with correct values', async () => {
    render();

    const validFromDateInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_from_label'),
    );

    expect(validFromDateInput).toHaveAttribute('value', mockAppMetadata.validFrom);
  });

  it('calls the "updateAppMetadataMutation" function when updating date and time in validFrom', () => {
    render();

    const validFromDateInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_from_label'),
    );
    fireEvent.change(validFromDateInput, { target: { value: mockValidFromNew } });
    fireEvent.blur(validFromDateInput);

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
  });

  it('loads the valid to data with correct values', async () => {
    render();

    const validToDateInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );

    expect(validToDateInput).toHaveAttribute('value', mockAppMetadata.validTo);
  });

  it('does not display the valid to components when validTo is undefined', async () => {
    render({ appMetadata: { ...mockAppMetadata, validTo: undefined } });

    const validToDateInput = screen.queryByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );
    expect(validToDateInput).not.toBeInTheDocument();
  });

  it('calls the "updateAppMetadataMutation" function when updating date and time in validTo', () => {
    render();

    const validToDateInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );
    fireEvent.change(validToDateInput, { target: { value: mockValidToNew } });
    fireEvent.blur(validToDateInput);

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
  });

  it('displays the valid to input when the select is clicked', async () => {
    const user = userEvent.setup();
    render({ appMetadata: { ...mockAppMetadata, validTo: undefined } });

    const validToDateInput = screen.queryByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );
    expect(validToDateInput).not.toBeInTheDocument();

    const switchInput = screen.getByLabelText(textMock('settings_modal.setup_tab_switch_validTo'));
    expect(switchInput).not.toBeChecked();

    await act(() => user.click(switchInput));

    const switchInputAfter = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_validTo'),
    );
    expect(switchInputAfter).toBeChecked();

    const validToDateInputAfter = screen.getByLabelText(
      textMock('settings_modal.setup_tab_valid_to_label'),
    );
    expect(validToDateInputAfter).toBeInTheDocument();
  });

  it('displays an error message when validTo is an earlier date than validFrom', () => {
    render({
      appMetadata: { ...mockAppMetadata, validFrom: mockValidFromNew, validTo: mockValidToNew },
    });

    const errorText = screen.getByText(textMock('settings_modal.setup_tab_start_before_end'));
    expect(errorText).toBeInTheDocument();
  });

  it('does not display an error message when validTo is a later date than validFrom', () => {
    render();

    const errorText = screen.queryByText(textMock('settings_modal.setup_tab_start_before_end'));
    expect(errorText).not.toBeInTheDocument();
  });

  it('loads the "autoDeleteOnProcessEnd" value correctly', () => {
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_autoDeleteOnProcessEnd'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "autoDeleteOnProcessEnd" switch', async () => {
    const user = userEvent.setup();
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_autoDeleteOnProcessEnd'),
    );
    expect(switchInput).toBeChecked();
    await act(() => user.click(switchInput));

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
  });

  it('loads the "messageBoxConfig.hideSettings.hideAlways" value correctly', () => {
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "messageBoxConfig.hideSettings.hideAlways" switch', async () => {
    const user = userEvent.setup();
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways'),
    );
    expect(switchInput).toBeChecked();
    await act(() => user.click(switchInput));

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
  });

  it('loads the "copyInstanceSettings.enabled" value correctly', () => {
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_copyInstanceSettings_enabled'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "copyInstanceSettings.enabled" switch', async () => {
    const user = userEvent.setup();
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_copyInstanceSettings_enabled'),
    );
    expect(switchInput).toBeChecked();
    await act(() => user.click(switchInput));

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
  });

  it('loads the "onEntry.show" value correctly', () => {
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_onEntry_show'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "onEntry.show" switch', async () => {
    const user = userEvent.setup();
    render();

    const switchInput = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_onEntry_show'),
    );
    expect(switchInput).toBeChecked();
    await act(() => user.click(switchInput));

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
  });
});

const render = (props: Partial<SetupTabContentProps> = {}) => {
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <SetupTabContent {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
