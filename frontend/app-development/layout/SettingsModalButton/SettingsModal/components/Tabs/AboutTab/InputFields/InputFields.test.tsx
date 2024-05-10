import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { InputFieldsProps } from './InputFields';
import { InputFields } from './InputFields';
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

    user.type(appName, mockNewText);

    await waitFor(() => expect(appName).toHaveValue(`${mockAppConfig.serviceName}${mockNewText}`));
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    render(<InputFields {...defaultProps} />);

    const altId = screen.getByLabelText(textMock('settings_modal.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    user.type(altId, mockNewText);

    await waitFor(() => expect(altId).toHaveValue(`${mockAppConfig.serviceId}${mockNewText}`));
  });

  describe('InputFields Validation', () => {
    const user = userEvent.setup();
    const appNameLabel = textMock('settings_modal.about_tab_name_label');

    it('should save changes when the form is valid', async () => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(appNameLabel);

      user.type(appName, mockNewText);
      user.tab();
      await waitFor(() => expect(mockOnSave).toHaveBeenCalledTimes(1));
    });

    it('should not save changes when form is invalid', async () => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(appNameLabel);

      await waitFor(() => user.clear(appName));
      user.tab();
      await waitFor(() => expect(mockOnSave).toHaveBeenCalledTimes(0));
    });

    it('should toggle error message based on form validation', async () => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(appNameLabel);
      const errorMessage = textMock('settings_modal.about_tab_name_error');

      await waitFor(() => user.clear(appName));
      user.tab();
      const errorMessageElement = await screen.findByText(errorMessage);
      expect(errorMessageElement).toBeInTheDocument();

      await waitFor(() => user.type(appName, mockNewText));
      user.tab();
      await waitFor(() => expect(screen.queryByText(errorMessage)).not.toBeInTheDocument());
    });
  });
});
