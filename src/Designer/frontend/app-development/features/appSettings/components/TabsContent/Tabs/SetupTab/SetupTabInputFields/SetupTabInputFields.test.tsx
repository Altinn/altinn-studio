import React from 'react';
import { screen } from '@testing-library/react';
import type { UseMutationResult } from '@tanstack/react-query';
import { SetupTabInputFields } from './SetupTabInputFields';
import type { SetupTabInputFieldsProps } from './SetupTabInputFields';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { useAppMetadataMutation } from '../../../../../../../hooks/mutations';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { mockAppMetadata } from '../../../../../../../test/applicationMetadataMock';
import userEvent from '@testing-library/user-event';

jest.mock('../../../../../../../hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, Error, ApplicationMetadata, unknown>);

describe('SetupTabInputFields', () => {
  afterEach(jest.clearAllMocks);

  it('does not display an error message when validTo is a later date than validFrom', () => {
    renderSetupTabInputFields();
    const errorText = screen.queryByText(textMock('app_settings.setup_tab_start_before_end'));
    expect(errorText).not.toBeInTheDocument();
  });

  it('loads the "autoDeleteOnProcessEnd" value correctly', () => {
    renderSetupTabInputFields();
    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_autoDeleteOnProcessEnd'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "autoDeleteOnProcessEnd" switch', async () => {
    const user = userEvent.setup();
    renderSetupTabInputFields();
    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_autoDeleteOnProcessEnd'),
    );
    expect(switchInput).toBeChecked();
    await user.click(switchInput);

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
    expect(updateAppMetadataMutation).toHaveBeenCalledWith({
      ...mockAppMetadata,
      autoDeleteOnProcessEnd: false,
    });
  });

  it('loads the "messageBoxConfig.hideSettings.hideAlways" value correctly', () => {
    renderSetupTabInputFields();
    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "messageBoxConfig.hideSettings.hideAlways" switch', async () => {
    const user = userEvent.setup();
    renderSetupTabInputFields();
    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways'),
    );
    expect(switchInput).toBeChecked();
    await user.click(switchInput);

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
    expect(updateAppMetadataMutation).toHaveBeenCalledWith({
      ...mockAppMetadata,
      messageBoxConfig: {
        ...mockAppMetadata.messageBoxConfig,
        hideSettings: {
          ...mockAppMetadata.messageBoxConfig?.hideSettings,
          hideAlways: false,
        },
      },
    });
  });

  it('loads the "copyInstanceSettings.enabled" value correctly', () => {
    renderSetupTabInputFields();
    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_copyInstanceSettings_enabled'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function when updating "copyInstanceSettings.enabled" switch', async () => {
    const user = userEvent.setup();
    renderSetupTabInputFields();

    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_copyInstanceSettings_enabled'),
    );
    expect(switchInput).toBeChecked();
    await user.click(switchInput);

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
    expect(updateAppMetadataMutation).toHaveBeenCalledWith({
      ...mockAppMetadata,
      copyInstanceSettings: {
        ...mockAppMetadata.copyInstanceSettings,
        enabled: false,
      },
    });
  });

  it('loads the "onEntry.show" value correctly', () => {
    renderSetupTabInputFields();
    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_onEntry_show'),
    );
    expect(switchInput).toBeChecked();
  });

  it('calls the "updateAppMetadataMutation" function with correct data when the user clicks the "onEntry.show" switch', async () => {
    const user = userEvent.setup();
    renderSetupTabInputFields();

    const switchInput = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_onEntry_show'),
    );
    expect(switchInput).toBeChecked();
    await user.click(switchInput);

    expect(updateAppMetadataMutation).toHaveBeenCalledTimes(1);
    expect(updateAppMetadataMutation).toHaveBeenCalledWith({
      ...mockAppMetadata,
      onEntry: undefined,
    });
  });
});

const defaultProps: SetupTabInputFieldsProps = {
  appMetadata: mockAppMetadata,
};

type Props = {
  componentProps?: Partial<SetupTabInputFieldsProps>;
  queries?: Partial<ServicesContextProps>;
};

const renderSetupTabInputFields = (props: Partial<Props> = {}) => {
  const { componentProps, queries } = props;
  const queryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(
    allQueries,
    queryClient,
  )(<SetupTabInputFields {...defaultProps} {...componentProps} />);
};
