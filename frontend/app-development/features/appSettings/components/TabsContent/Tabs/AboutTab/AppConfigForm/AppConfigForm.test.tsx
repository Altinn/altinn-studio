import React from 'react';
import { screen } from '@testing-library/react';
import { AppConfigForm } from './AppConfigForm';
import type { AppConfigFormProps } from './AppConfigForm';
import type { AppConfigNew } from 'app-shared/types/AppConfig';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/mocks';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';

jest.mock('../hooks/useScrollIntoView', () => ({
  useScrollIntoView: jest.fn(),
}));

describe('AppConfigForm', () => {
  afterEach(jest.clearAllMocks);

  it('renders error summary when the save button is pressed and there are errors', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

    const anInputField = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newValue: string = 'A';
    await user.type(anInputField, newValue);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(getErrorHeader()).toBeInTheDocument();
    expect(
      getLink(errorMessageServiceNameNN('app_settings.about_tab_error_usage_string_service_name')),
    ).toBeInTheDocument();
    expect(
      getLink(errorMessageServiceNameEN('app_settings.about_tab_error_usage_string_service_name')),
    ).toBeInTheDocument();
  });

  it('does not render error summary when the save button is pressed and there are no errors', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: mockAppConfigComplete });

    const anInputField = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newValue: string = 'A';
    await user.type(anInputField, newValue);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(queryErrorHeader()).not.toBeInTheDocument();
  });

  it('displays the "repo" input as readonly', () => {
    renderAppConfigForm();

    const repoNameInput = getTextbox(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "serviceName" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

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
    renderAppConfigForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    const newText: string = 'A';
    await user.type(altId, newText);

    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${newText}`);
  });

  it('displays correct value in "description" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: { ...mockAppConfig, description: mockDescription } });

    const description = getRequiredTextbox(
      `${textMock('app_settings.about_tab_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(description).toHaveValue(mockDescription.nb);

    const newText: string = 'A';
    await user.type(description, newText);

    expect(description).toHaveValue(`${mockDescription.nb}${newText}`);
  });

  it('displays description as empty when there is no description set', () => {
    renderAppConfigForm();

    const description = getRequiredTextbox(
      `${textMock('app_settings.about_tab_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(description).toHaveValue('');
  });

  it('displays homepage as empty when there is no homepage set', () => {
    renderAppConfigForm();

    const homepage = getOptionalTextbox(textMock('app_settings.about_tab_homepage_field_label'));
    expect(homepage).toHaveValue('');
  });

  it('displays correct value in "homepage" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: { ...mockAppConfig, homepage: mockHomepage } });

    const homepage = getOptionalTextbox(textMock('app_settings.about_tab_homepage_field_label'));
    expect(homepage).toHaveValue(mockHomepage);

    const newText: string = 'A';
    await user.type(homepage, newText);

    expect(homepage).toHaveValue(`${mockHomepage}${newText}`);
  });

  it('displays isDelegable as false when there is no value set', () => {
    renderAppConfigForm();

    const isDelegable = getSwitch(
      textMock('app_settings.about_tab_delegable_show_text', {
        shouldText: textMock('app_settings.about_tab_switch_should_not'),
      }),
    );
    expect(isDelegable).not.toBeChecked();
  });

  it('displays correct value in "isDelegable", and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: { ...mockAppConfig, isDelegable: false } });

    const isDelegable = getSwitch(
      textMock('app_settings.about_tab_delegable_show_text', {
        shouldText: textMock('app_settings.about_tab_switch_should_not'),
      }),
    );
    expect(isDelegable).not.toBeChecked();

    await user.click(isDelegable);

    expect(isDelegable).toBeChecked();
  });

  it('does not show rightDescription when isDelegable is false', () => {
    renderAppConfigForm({ appConfig: { ...mockAppConfig, isDelegable: false } });
    const rightDescription = queryRequiredTextbox(
      `${textMock('app_settings.about_tab_right_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(rightDescription).not.toBeInTheDocument();
  });

  it('displays correct value in "rightDescription" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({
      appConfig: { ...mockAppConfig, rightDescription: mockRightDescription, isDelegable: true },
    });

    const rightDescription = getRequiredTextbox(
      `${textMock('app_settings.about_tab_right_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(rightDescription).toHaveValue(mockRightDescription.nb);

    const newText: string = 'A';
    await user.type(rightDescription, newText);

    expect(rightDescription).toHaveValue(`${mockRightDescription.nb}${newText}`);
  });

  it('displays rightDescription as empty when there is no description set', () => {
    renderAppConfigForm({ appConfig: { ...mockAppConfig, isDelegable: true } });

    const rightDescription = getRequiredTextbox(
      `${textMock('app_settings.about_tab_right_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(rightDescription).toHaveValue('');
  });

  it('disables the action buttons when no changes are made', () => {
    renderAppConfigForm();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    expect(saveButton).toBeDisabled();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    expect(cancelButton).toBeDisabled();
  });

  it('enables action buttons when changes are made', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    expect(saveButton).not.toBeDisabled();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    expect(cancelButton).not.toBeDisabled();
  });

  // Test that the save button calls saveAppConfig with correct data when fields are changed
  it('does not call saveAppConfig when fields are changed but there are errors', async () => {
    const user = userEvent.setup();
    const saveAppConfig = jest.fn();
    renderAppConfigForm({ saveAppConfig });

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(saveAppConfig).not.toHaveBeenCalled();
    expect(getErrorHeader()).toBeInTheDocument();
  });

  it('calls saveAppConfig with correct data when fields are changed and there are no errors', async () => {
    const user = userEvent.setup();
    const saveAppConfig = jest.fn();
    renderAppConfigForm({
      appConfig: mockAppConfigComplete,
      saveAppConfig,
    });

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(saveAppConfig).toHaveBeenCalledWith({
      ...mockAppConfigComplete,
      serviceId: `${mockAppConfigComplete.serviceId}${newText}`,
    });
  });

  it('should hide the error summary when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderAppConfigForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);
    expect(getErrorHeader()).toBeInTheDocument();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);
    expect(queryErrorHeader()).not.toBeInTheDocument();
  });

  it('should not reset the form when the cancel button is clicked without confirmation', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    renderAppConfigForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);
    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${newText}`);

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);
    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${newText}`);
  });

  it('should reset the form to the original values when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderAppConfigForm();

    const altId = getOptionalTextbox(textMock('app_settings.about_tab_alt_id_label'));
    const newText: string = 'A';
    await user.type(altId, newText);
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${newText}`);

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);

    expect(altId).toHaveValue(mockAppConfig.serviceId);
  });

  it('should hide the alert when the required fields are filled in correctly', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: { ...mockAppConfig, description: mockDescription } });

    const appName = getRequiredTextbox(
      `${textMock('app_settings.about_tab_name_label')} (${textMock('language.nb')})`,
    );

    await user.type(appName, 'Tjeneste');
    await user.tab();

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(getErrorHeader()).toBeInTheDocument();
    expect(
      getLink(errorMessageServiceNameNN('app_settings.about_tab_error_usage_string_service_name')),
    ).toBeInTheDocument();
    expect(
      getLink(errorMessageServiceNameEN('app_settings.about_tab_error_usage_string_service_name')),
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
      queryLink(
        errorMessageServiceNameNN('app_settings.about_tab_error_usage_string_service_name'),
      ),
    ).not.toBeInTheDocument();

    const enInput = getRequiredTextbox(
      `${textMock('app_settings.about_tab_name_label')} (${textMock('language.en')})`,
    );
    await user.type(enInput, 'Service');
    expect(
      queryLink(
        errorMessageServiceNameEN('app_settings.about_tab_error_usage_string_service_name'),
      ),
    ).not.toBeInTheDocument();

    expect(queryErrorHeader()).not.toBeInTheDocument();
  });
});

const mockServiceName: SupportedLanguage = { nb: 'Tjeneste', nn: '', en: '' };
const mockDescription: SupportedLanguage = {
  nb: 'Dette er en beskrivelse',
  nn: 'Dette er ei tenestebeskriving',
  en: 'This is a description',
};
const mockRightDescription: SupportedLanguage = {
  nb: 'Dette er en rettighetsbeskrivelse',
  nn: 'Dette er ei rettigheitstekst',
  en: 'This is a right description',
};
const mockHomepage: string = 'https://example.com/homepage';
const mockServiceNameComplete: SupportedLanguage = {
  nb: 'Tjeneste',
  nn: 'Teneste',
  en: 'Service',
};
const mockAppConfig: AppConfigNew = {
  serviceId: 'some-id',
  serviceName: mockServiceName,
  repositoryName: 'my-repo',
};
const mockAppConfigComplete: AppConfigNew = {
  serviceId: 'some-id',
  serviceName: mockServiceNameComplete,
  repositoryName: 'my-repo',
  description: mockDescription,
  homepage: mockHomepage,
  isDelegable: false,
  rightDescription: mockRightDescription,
};

const defaultProps: AppConfigFormProps = {
  appConfig: mockAppConfig,
  saveAppConfig: jest.fn(),
};

function renderAppConfigForm(props: Partial<AppConfigFormProps> = {}) {
  return renderWithProviders()(<AppConfigForm {...defaultProps} {...props} />);
}

const getRequiredTextbox = (name: string): HTMLInputElement =>
  getTextbox(`${name} ${requiredText}`);
const queryRequiredTextbox = (name: string): HTMLInputElement | null =>
  queryTextbox(`${name} ${requiredText}`) || null;
const getOptionalTextbox = (name: string): HTMLInputElement =>
  getTextbox(`${name} ${optionalText}`);
const getTextbox = (name: string): HTMLInputElement => screen.getByRole('textbox', { name });
const queryTextbox = (name: string): HTMLInputElement | null =>
  screen.queryByRole('textbox', { name });
const getLink = (name: string): HTMLAnchorElement => screen.getByRole('link', { name });
const queryLink = (name: string): HTMLAnchorElement | null => screen.queryByRole('link', { name });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
const getErrorHeader = (): HTMLHeadingElement =>
  screen.getByRole('heading', {
    name: textMock('app_settings.about_tab_error_summary_header'),
    level: 2,
  });
const queryErrorHeader = (): HTMLHeadingElement | null =>
  screen.queryByRole('heading', {
    name: textMock('app_settings.about_tab_error_summary_header'),
    level: 2,
  });
const getSwitch = (name: string): HTMLInputElement => screen.getByRole('switch', { name });

const optionalText: string = textMock('general.optional');
const requiredText: string = textMock('general.required');

const errorMessageServiceNameNN = (field: string): string =>
  textMock('app_settings.about_tab_error_translation_missing_nn', {
    field: textMock(field),
  });

const errorMessageServiceNameEN = (field: string): string =>
  textMock('app_settings.about_tab_error_translation_missing_en', {
    field: textMock(field),
  });
