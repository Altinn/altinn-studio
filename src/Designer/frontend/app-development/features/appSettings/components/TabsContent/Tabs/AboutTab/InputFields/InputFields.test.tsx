import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InputFieldsProps } from './InputFields';
import { InputFields } from './InputFields';
import { mockAppConfig } from '../../../../../mocks/appConfigMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
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

    const repoNameInput = screen.getByLabelText(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "name" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderInputFields();

    const appName = screen.getByLabelText(textMock('app_settings.about_tab_name_label'));
    expect(appName).toHaveValue(mockAppConfig.serviceName);

    await user.type(appName, mockNewText);

    expect(appName).toHaveValue(`${mockAppConfig.serviceName}${mockNewText}`);
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderInputFields();

    const altId = screen.getByLabelText(textMock('app_settings.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    await user.type(altId, mockNewText);

    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${mockNewText}`);
  });

  describe('InputFields Validation', () => {
    const user = userEvent.setup();
    const appNameLabel = textMock('app_settings.about_tab_name_label');

    it('should save changes when the form is valid', async () => {
      renderInputFields();
      const appName = screen.getByLabelText(appNameLabel);

      await user.type(appName, mockNewText);
      await user.tab();
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('should not save changes when form is invalid', async () => {
      renderInputFields();
      const appName = screen.getByLabelText(appNameLabel);

      await user.clear(appName);
      await user.tab();
      expect(mockOnSave).toHaveBeenCalledTimes(0);
    });

    it('should toggle error message based on form validation', async () => {
      renderInputFields();
      const appName = screen.getByLabelText(appNameLabel);
      const errorMessage = textMock('app_settings.about_tab_name_error');

      await user.clear(appName);
      await user.tab();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      await user.type(appName, mockNewText);
      await user.tab();
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });
});

const renderInputFields = (props: Partial<InputFieldsProps> = {}) => {
  return render(<InputFields {...defaultProps} {...props} />);
};
