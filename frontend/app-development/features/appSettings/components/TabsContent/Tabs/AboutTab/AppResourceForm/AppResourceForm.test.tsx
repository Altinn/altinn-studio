import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppResourceForm } from './AppResourceForm';
import type { AppResourceFormProps } from './AppResourceForm';
import type { AppResource } from 'app-shared/types/AppResource';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { useBlocker } from 'react-router-dom';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useBlocker: jest.fn(),
}));

jest.mock('../hooks/useScrollIntoView', () => ({
  useScrollIntoView: jest.fn(),
}));

describe('AppResourceForm', () => {
  afterEach(jest.clearAllMocks);

  beforeEach(() => {
    (useBlocker as jest.Mock).mockReturnValue({ state: 'unblocked' });
  });

  // TESTS
  // Test that error summary is displayed correctly
  it('renders error summary when there are errors', async () => {
    const user = userEvent.setup();
    // Mock values for serviceName

    renderAppResourceForm();

    const anInputField = getTextbox(
      `${textMock('app_settings.about_tab_alt_id_label')} ${optionalText}`,
    );
    const newValue: string = 'A';
    await user.type(anInputField, newValue);

    // Call save button
    const saveButton = getButton(textMock('app_settings.about_tab_save_button'));
    await user.click(saveButton);

    // Error now present

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(getLink(errorMessageServiceNameMissingNNandEN)).toBeInTheDocument();
    expect(getLink(errorMessageServiceNameNN)).toBeInTheDocument();
    expect(getLink(errorMessageServiceNameEN)).toBeInTheDocument();
  });

  // Test that warning is displayed

  // Test the readoly field

  // Test that the language field is present for serviceName

  // Test that the alt id description is displayed

  // Test that the save button is disabled when no changes are made

  // Test that the save button is enabled when changes are made

  // Test that the save button calls saveAppResource with correct data when fields are changed
});

const mockServiceName: SupportedLanguage = { nb: 'Tjeneste', nn: '', en: '' };
const mockAppResource: AppResource = {
  serviceId: 'some-id',
  serviceName: mockServiceName,
  repositoryName: 'my-repo',
};

const defaultProps: AppResourceFormProps = {
  appResource: mockAppResource,
  saveAppResource: jest.fn(),
};

function renderAppResourceForm(props: Partial<AppResourceFormProps> = {}) {
  return renderWithProviders()(<AppResourceForm {...defaultProps} {...props} />);
}

const getTextbox = (name: string): HTMLInputElement => screen.getByRole('textbox', { name });
const getLink = (name: string): HTMLAnchorElement => screen.getByRole('link', { name });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });

const optionalText: string = textMock('general.optional');
const errorMessageServiceNameMissingNNandEN: string = textMock(
  'app_settings.about_tab_language_error_missing_2',
  {
    usageString: textMock('app_settings.about_tab_error_usage_string_service_name'),
    lang1: textMock('language.nn'),
    lang2: textMock('language.en'),
  },
);
const errorMessageServiceNameNN: string = textMock(
  'app_settings.about_tab_error_translation_missing_service_name_nn',
);
const errorMessageServiceNameEN: string = textMock(
  'app_settings.about_tab_error_translation_missing_service_name_en',
);
