import React from 'react';
import { screen } from '@testing-library/react';
import { AppResourceForm } from './AppResourceForm';
import type { AppResourceFormProps } from './AppResourceForm';
import type { AppResource } from 'app-shared/types/AppResource';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/mocks';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';

jest.mock('../hooks/useScrollIntoView', () => ({
  useScrollIntoView: jest.fn(),
}));

describe('AppResourceForm', () => {
  afterEach(jest.clearAllMocks);

  it('renders error summary when the save button is pressed and there are errors', async () => {
    const user = userEvent.setup();
    renderAppResourceForm();

    const anInputField = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newValue: string = 'A';
    await user.type(anInputField, newValue);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(getAlert()).toBeInTheDocument();
    expect(getLink(errorMessageServiceNameNN)).toBeInTheDocument();
    expect(getLink(errorMessageServiceNameEN)).toBeInTheDocument();
    expect(getText(errorMessageServiceNameMissingNNandEN)).toBeInTheDocument();
  });

  it('does not render error summary when the save button is pressed and there are no errors', async () => {
    const user = userEvent.setup();
    renderAppResourceForm({ appResource: mockAppResourceComplete });

    const anInputField = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newValue: string = 'A';
    await user.type(anInputField, newValue);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(queryAlert()).not.toBeInTheDocument();
  });

  it('displays the "repo" input as readonly', () => {
    renderAppResourceForm();

    const repoNameInput = getTextbox(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppResource.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "serviceName" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppResourceForm();

    const appName = getRequiredTextbox(
      `${textMock('app_settings.about_tab_name_label')} (${textMock('language.nb')})`,
    );
    expect(appName).toHaveValue(mockServiceName.nb);

    const newText: string = 'A';
    await user.type(appName, newText);

    expect(appName).toHaveValue(`${mockServiceName.nb}${newText}`);
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppResourceForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppResource.serviceId);

    const newText: string = 'A';
    await user.type(altId, newText);

    expect(altId).toHaveValue(`${mockAppResource.serviceId}${newText}`);
  });

  it('disables the action buttons when no changes are made', () => {
    renderAppResourceForm();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    expect(saveButton).toBeDisabled();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    expect(cancelButton).toBeDisabled();
  });

  it('enables action buttons when changes are made', async () => {
    const user = userEvent.setup();
    renderAppResourceForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    expect(saveButton).not.toBeDisabled();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    expect(cancelButton).not.toBeDisabled();
  });

  // Test that the save button calls saveAppResource with correct data when fields are changed
  it('does not call saveAppResource when fields are changed but there are errors', async () => {
    const user = userEvent.setup();
    const saveAppResourceMock = jest.fn();
    renderAppResourceForm({ saveAppResource: saveAppResourceMock });

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(saveAppResourceMock).not.toHaveBeenCalled();
    expect(getAlert()).toBeInTheDocument();
  });

  it('calls saveAppResource with correct data when fields are changed and there are no errors', async () => {
    const user = userEvent.setup();
    const saveAppResourceMock = jest.fn();
    renderAppResourceForm({
      appResource: mockAppResourceComplete,
      saveAppResource: saveAppResourceMock,
    });

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(saveAppResourceMock).toHaveBeenCalledWith({
      ...mockAppResourceComplete,
      serviceId: `${mockAppResourceComplete.serviceId}${newText}`,
    });
  });

  it('should hide the error summary when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderAppResourceForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);
    expect(getAlert()).toBeInTheDocument();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);
    expect(queryAlert()).not.toBeInTheDocument();
  });

  it('should not reset the form when the cancel button is clicked without confirmation', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    renderAppResourceForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);
    expect(altId).toHaveValue(`${mockAppResource.serviceId}${newText}`);

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);
    expect(altId).toHaveValue(`${mockAppResource.serviceId}${newText}`);
  });

  it('should reset the form to the original values when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderAppResourceForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(altId).toHaveValue(`${mockAppResource.serviceId}${newText}`);

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);

    expect(altId).toHaveValue(mockAppResource.serviceId);
  });

  it('should hide the alert when the required fields are filled in correctly', async () => {
    const user = userEvent.setup();
    renderAppResourceForm();

    const appName = getRequiredTextbox(
      `${textMock('app_settings.about_tab_name_label')} (${textMock('language.nb')})`,
    );

    await user.type(appName, 'Tjeneste');
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(getAlert()).toBeInTheDocument();
    expect(
      getLink(textMock('app_settings.about_tab_error_translation_missing_service_name_nn')),
    ).toBeInTheDocument();
    expect(
      getLink(textMock('app_settings.about_tab_error_translation_missing_service_name_en')),
    ).toBeInTheDocument();

    const detailsButton = getButton(
      `${textMock('app_settings.about_tab_language_translation_header', {
        field: textMock('app_settings.about_tab_name_label'),
      })} ${textMock('general.required')}`,
    );
    await user.click(detailsButton);

    const nnInput = getRequiredTextbox(
      `${textMock('app_settings.about_tab_name_label')} (${textMock('language.nn')})`,
    );
    await user.type(nnInput, 'Teneste');

    expect(
      queryLink(textMock('app_settings.about_tab_error_translation_missing_service_name_nn')),
    ).not.toBeInTheDocument();

    const enInput = getRequiredTextbox(
      `${textMock('app_settings.about_tab_name_label')} (${textMock('language.en')})`,
    );
    await user.type(enInput, 'Service');
    expect(
      queryLink(textMock('app_settings.about_tab_error_translation_missing_service_name_en')),
    ).not.toBeInTheDocument();

    expect(queryAlert()).not.toBeInTheDocument();
  });
});

const mockServiceName: SupportedLanguage = { nb: 'Tjeneste', nn: '', en: '' };
const mockServiceNameComplete: SupportedLanguage = {
  nb: 'Tjeneste',
  nn: 'Teneste',
  en: 'Service',
};
const mockAppResource: AppResource = {
  serviceId: 'some-id',
  serviceName: mockServiceName,
  repositoryName: 'my-repo',
};
const mockAppResourceComplete: AppResource = {
  serviceId: 'some-id',
  serviceName: mockServiceNameComplete,
  repositoryName: 'my-repo',
};

const defaultProps: AppResourceFormProps = {
  appResource: mockAppResource,
  saveAppResource: jest.fn(),
};

function renderAppResourceForm(props: Partial<AppResourceFormProps> = {}) {
  return renderWithProviders()(<AppResourceForm {...defaultProps} {...props} />);
}

const getRequiredTextbox = (name: string): HTMLInputElement =>
  getTextbox(`${name} ${requiredText}`);
const getOptionalTextbox = (name: string): HTMLInputElement =>
  getTextbox(`${name} ${optionalText}`);
const getTextbox = (name: string): HTMLInputElement => screen.getByRole('textbox', { name });
const getLink = (name: string): HTMLAnchorElement => screen.getByRole('link', { name });
const queryLink = (name: string): HTMLAnchorElement => screen.queryByRole('link', { name });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
const getAlert = () => screen.getByRole('alert');
const queryAlert = () => screen.queryByRole('alert');
const getText = (name: string): HTMLParagraphElement => screen.getByText(name);

const optionalText: string = textMock('general.optional');
const requiredText: string = textMock('general.required');
const errorMessageServiceNameMissingNNandEN: string = textMock(
  'app_settings.about_tab_language_error_missing_2',
  {
    usageString: textMock('app_settings.about_tab_error_usage_string_service_name'),
    lang1: textMock('language.nn').toLowerCase(),
    lang2: textMock('language.en').toLowerCase(),
  },
);
const errorMessageServiceNameNN: string = textMock(
  'app_settings.about_tab_error_translation_missing_service_name_nn',
);
const errorMessageServiceNameEN: string = textMock(
  'app_settings.about_tab_error_translation_missing_service_name_en',
);
