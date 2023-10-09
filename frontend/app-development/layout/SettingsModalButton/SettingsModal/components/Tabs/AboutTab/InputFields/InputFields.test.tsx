import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { InputFields, InputFieldsProps } from './InputFields';
import { mockAppConfig } from 'app-development/layout/SettingsModalButton/SettingsModal/mocks/appConfigMock';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockNewText: string = 'test';

const mockOnSave = jest.fn();

const defaultProps: InputFieldsProps = {
  appConfig: mockAppConfig,
  onSave: mockOnSave,
};

describe('InputFields', () => {
  afterEach(jest.clearAllMocks);

  it('displays the "repo" input as readonly', async () => {
    render(<InputFields {...defaultProps} />);

    const repoNameInput = screen.getByLabelText(textMock('settings_modal.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "name" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    render(<InputFields {...defaultProps} />);

    const appName = screen.getByLabelText(textMock('settings_modal.about_tab_name_label'));
    expect(appName).toHaveValue(mockAppConfig.serviceName);

    await act(() => user.type(appName, mockNewText));

    expect(appName).toHaveValue(`${mockAppConfig.serviceName}${mockNewText}`);
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    render(<InputFields {...defaultProps} />);

    const altId = screen.getByLabelText(textMock('settings_modal.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    await act(() => user.type(altId, mockNewText));

    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${mockNewText}`);
  });
});
