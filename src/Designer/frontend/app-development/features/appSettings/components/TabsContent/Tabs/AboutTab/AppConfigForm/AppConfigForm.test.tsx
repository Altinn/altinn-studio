import React from 'react';
import { screen } from '@testing-library/react';
import { AppConfigForm } from './AppConfigForm';
import type { AppConfigFormProps } from './AppConfigForm';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/mocks';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import type { ApplicationMetadata, ContactPoint } from 'app-shared/types/ApplicationMetadata';

jest.mock('../hooks/useScrollIntoView', () => ({
  useScrollIntoView: jest.fn(),
}));

describe('AppConfigForm', () => {
  afterEach(jest.clearAllMocks);

  it('does not render error summary when the save button is pressed and there are no errors', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: mockAppConfigComplete });

    const homepageInput = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_homepage_field_label'),
    );
    const newValue: string = 'A';
    await user.type(homepageInput, newValue);
    await user.click(getInlineEditSaveButton());

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(queryErrorHeader()).not.toBeInTheDocument();
  });

  it('displays the "repo" input as readonly', () => {
    renderAppConfigForm();

    const repoNameInput = getTextbox(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.id);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "title" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

    const appName = getTextbox(
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

    const altId = getServiceNameNbTextbox();
    expect(altId).toHaveValue(mockAppConfig.title.nb);

    const newText: string = 'A';
    await user.type(altId, newText);

    expect(altId).toHaveValue(`${mockAppConfig.title.nb}${newText}`);
  });

  it('displays correct value in "description" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: { ...mockAppConfig, description: mockDescription } });

    const description = getTextbox(
      `${textMock('app_settings.about_tab_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(description).toHaveValue(mockDescription.nb);

    const newText: string = 'A';
    await user.type(description, newText);

    expect(description).toHaveValue(`${mockDescription.nb}${newText}`);
  });

  it('displays description as empty when there is no description set', () => {
    renderAppConfigForm();

    const description = getTextbox(
      `${textMock('app_settings.about_tab_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(description).toHaveValue('');
  });

  it('displays homepage as empty when there is no homepage set', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

    const homepage = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_homepage_field_label'),
    );
    expect(homepage).toHaveValue('');
  });

  it('displays correct value in "homepage" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({ appConfig: { ...mockAppConfig, homepage: mockHomepage } });

    const homepage = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_homepage_field_label'),
    );
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
    renderAppConfigForm({ appConfig: { ...mockAppConfig, access: { delegable: false } } });

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
    renderAppConfigForm({ appConfig: { ...mockAppConfig, access: { delegable: false } } });
    const rightDescription = queryRequiredTextbox(
      `${textMock('app_settings.about_tab_right_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(rightDescription).not.toBeInTheDocument();
  });

  it('displays correct value in "rightDescription" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm({
      appConfig: {
        ...mockAppConfig,
        access: { rightDescription: mockRightDescription, delegable: true },
      },
    });

    const rightDescription = getTextbox(
      `${textMock('app_settings.about_tab_right_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(rightDescription).toHaveValue(mockRightDescription.nb);

    const newText: string = 'A';
    await user.type(rightDescription, newText);

    expect(rightDescription).toHaveValue(`${mockRightDescription.nb}${newText}`);
  });

  it('displays rightDescription as empty when there is no description set', () => {
    renderAppConfigForm({ appConfig: { ...mockAppConfig, access: { delegable: true } } });

    const rightDescription = getTextbox(
      `${textMock('app_settings.about_tab_right_description_field_label')} (${textMock('language.nb')})`,
    );
    expect(rightDescription).toHaveValue('');
  });

  it('updates "keywords" input field with correct value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

    const keywords = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_keywords_label'),
    );
    expect(keywords).toHaveValue('');

    const newText: string = 'keyword1, keyword2';
    await user.type(keywords, newText);

    expect(keywords).toHaveValue(newText);
  });

  it('updates keywords in app config when keywords inline edit is saved and form is saved', async () => {
    const user = userEvent.setup();
    const saveAppConfig = jest.fn();
    renderAppConfigForm({
      appConfig: mockAppConfigComplete,
      saveAppConfig,
    });

    const keywordsInput = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_keywords_label'),
    );
    const newKeywordsText = 'Krav, Betaling';
    await user.type(keywordsInput, newKeywordsText);
    await user.click(getInlineEditSaveButton());

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(saveAppConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: [
          { language: 'nb', word: 'Krav' },
          { language: 'nb', word: 'Betaling' },
        ],
      }),
    );
  });

  it('updates "visible" input field with correct value on change', async () => {
    const user = userEvent.setup();
    renderAppConfigForm();

    const visible = getSwitch(
      textMock('app_settings.about_tab_visible_show_text', {
        shouldText: textMock('app_settings.about_tab_switch_should_not'),
      }),
    );
    expect(visible).not.toBeChecked();

    await user.click(visible);

    expect(visible).toBeChecked();
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

    const homepageInput = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_homepage_field_label'),
    );
    const newText: string = 'A';
    await user.type(homepageInput, newText);
    await user.click(getInlineEditSaveButton());

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    expect(saveButton).not.toBeDisabled();

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    expect(cancelButton).not.toBeDisabled();
  });

  it('calls saveAppConfig with correct data when fields are changed and there are no errors', async () => {
    const user = userEvent.setup();
    const saveAppConfig = jest.fn();
    renderAppConfigForm({
      appConfig: mockAppConfigComplete,
      saveAppConfig,
    });

    const homepageInput = await getOptionalInlineEditTextbox(
      user,
      textMock('app_settings.about_tab_homepage_field_label'),
    );
    const newText: string = 'A';
    await user.type(homepageInput, newText);
    await user.click(getInlineEditSaveButton());

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(saveAppConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        homepage: `${mockAppConfigComplete.homepage}${newText}`,
      }),
    );
  });

  it('should not reset the form when the cancel button is clicked without confirmation', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    renderAppConfigForm();

    const titleInput = getServiceNameNbTextbox();
    const newText: string = 'A';
    await user.type(titleInput, newText);

    expect(titleInput).toHaveValue(`${mockAppConfig.title.nb}${newText}`);
    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);
    expect(titleInput).toHaveValue(`${mockAppConfig.title.nb}${newText}`);
  });

  it('should reset the form to the original values when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderAppConfigForm();

    const titleInput = getServiceNameNbTextbox();
    const newText: string = 'A';
    await user.type(titleInput, newText);

    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    expect(titleInput).toHaveValue(`${mockAppConfig.title.nb}${newText}`);

    const cancelButton = getButton(textMock('app_settings.about_tab_reset_button'));
    await user.click(cancelButton);

    expect(titleInput).toHaveValue(mockAppConfig.title.nb);
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
const mockAppConfig: ApplicationMetadata = {
  id: 'ttd/some-id',
  org: 'ttd',
  title: mockServiceName,
};
const mockContactPoints: ContactPoint = {
  category: 'category',
  email: 'email',
  telephone: '12345678',
  contactPage: 'https://example.com',
};
const mockAppConfigComplete: ApplicationMetadata = {
  id: 'ttd/some-id',
  org: 'ttd',
  title: mockServiceNameComplete,
  description: mockDescription,
  homepage: mockHomepage,
  access: {
    delegable: false,
    rightDescription: mockRightDescription,
  },
  partyTypesAllowed: { person: true, bankruptcyEstate: false, organisation: false, subUnit: false },
  contactPoints: [mockContactPoints],
};

const defaultProps: AppConfigFormProps = {
  appConfig: mockAppConfig,
  saveAppConfig: jest.fn(),
};

function renderAppConfigForm(props: Partial<AppConfigFormProps> = {}) {
  return renderWithProviders()(<AppConfigForm {...defaultProps} {...props} />);
}

const queryRequiredTextbox = (name: string): HTMLInputElement | null =>
  queryTextbox(`${name} ${requiredText}`) || null;

const getTextbox = (name: string | RegExp): HTMLInputElement =>
  screen.getByRole('textbox', { name });
const queryTextbox = (name: string): HTMLInputElement | null =>
  screen.queryByRole('textbox', { name });

async function getOptionalInlineEditTextbox(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
): Promise<HTMLInputElement> {
  const viewButton = screen.getByRole('button', { name: label });
  await user.click(viewButton);
  return screen.getByRole('textbox', { name: `${label} ${optionalText}` }) as HTMLInputElement;
}

function getInlineEditSaveButton(): HTMLElement {
  return screen.getByRole('button', { name: textMock('general.save') });
}

const getServiceNameNbTextbox = (): HTMLInputElement =>
  getTextbox(/app_settings\.about_tab_name_label.*language\.nb/i);
// const getLink = (name: string): HTMLAnchorElement => screen.getByRole('link', { name });
// const queryLink = (name: string): HTMLAnchorElement | null => screen.queryByRole('link', { name });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
// const getErrorHeader = (): HTMLHeadingElement =>
//   screen.getByRole('heading', {
//     name: textMock('app_settings.about_tab_error_summary_header'),
//     level: 2,
//   });
const queryErrorHeader = (): HTMLHeadingElement | null =>
  screen.queryByRole('heading', {
    name: textMock('app_settings.about_tab_error_summary_header'),
    level: 2,
  });
const getSwitch = (name: string): HTMLInputElement => screen.getByRole('switch', { name });
// const getLabelText = (name: string): HTMLLabelElement => screen.getByLabelText(name);

const optionalText: string = textMock('general.optional');
const requiredText: string = textMock('general.required');
// const errorMessageServiceNameNN = (field: string): string =>
//   textMock('app_settings.about_tab_error_translation_missing_nn', {
//     field: textMock(field),
//   });

// const errorMessageServiceNameEN = (field: string): string =>
//   textMock('app_settings.about_tab_error_translation_missing_en', {
//     field: textMock(field),
//   });
