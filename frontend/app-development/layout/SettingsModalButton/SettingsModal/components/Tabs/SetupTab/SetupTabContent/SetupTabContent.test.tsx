import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
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

jest.mock('../../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, Error, ApplicationMetadata, unknown>);

const defaultProps: SetupTabContentProps = {
  appMetadata: mockAppMetadata,
  org: mockOrg,
  app: mockApp,
};

describe('SetupTabContent', () => {
  afterEach(jest.clearAllMocks);

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
