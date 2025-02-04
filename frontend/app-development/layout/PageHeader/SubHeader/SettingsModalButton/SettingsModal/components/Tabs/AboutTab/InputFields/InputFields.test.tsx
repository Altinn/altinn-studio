import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InputFieldsProps, ServiceNames } from './InputFields';
import { InputFields } from './InputFields';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockNewText: string = 'test';
const langNb = 'nb';
const langEn = 'en';
const langNn = 'nn';
const langDa = 'da';
const recommendedLanguages = [langNb, langEn, langNn];
const appLangCodes: string[] = [langNb, langDa];
const onSave = jest.fn();
const repositoryName = 'repositoryName';
const serviceNames: ServiceNames<(typeof appLangCodes)[number]> = {
  [langNb]: 'mockAppTitleNb',
  [langEn]: undefined,
  [langNn]: undefined,
  [langDa]: 'mockAppTitleDa',
};

const defaultProps: InputFieldsProps<(typeof appLangCodes)[number]> = {
  appLangCodes,
  onSave,
  repositoryName,
  serviceNames,
};

describe('InputFields', () => {
  afterEach(jest.clearAllMocks);

  it('displays the "repo" input as readonly', () => {
    render(<InputFields {...defaultProps} />);

    const repoNameInput = screen.getByLabelText(textMock('settings_modal.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in nb "name" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    render(<InputFields {...defaultProps} />);

    const appName = screen.getByLabelText(textMock('language.nb'));
    expect(appName).toHaveValue(serviceNames.nb);
    await user.clear(appName);
    await user.type(appName, mockNewText);

    expect(appName).toHaveValue(mockNewText);
  });

  it.each(recommendedLanguages)(
    'displays reccomended language "name" input field by default',
    (lang) => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(textMock(`language.${lang}`));
      expect(appName).toBeInTheDocument();
    },
  );

  it('does not display non-recommended language "name" input field by default', () => {
    render(<InputFields {...defaultProps} />);
    const appName = screen.queryByLabelText(textMock(`language.${langDa}`));
    expect(appName).not.toBeInTheDocument();
  });

  it('displays all language input fields when "show more languages" is clicked', async () => {
    const user = userEvent.setup();
    render(<InputFields {...defaultProps} />);
    const showMoreLanguagesButton = screen.getByText(
      textMock('settings_modal.about_tab.show_more_languages'),
    );
    await user.click(showMoreLanguagesButton);

    const appNameEn = screen.getByLabelText(textMock(`language.${langDa}`));
    expect(appNameEn).toBeInTheDocument();
  });

  describe('InputFields Validation', () => {
    const user = userEvent.setup();
    const appNameLabel = textMock('language.nb');

    it('should save changes when the form is valid', async () => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(appNameLabel);

      await user.type(appName, mockNewText);
      await user.tab();
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should not save changes when form is invalid', async () => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(appNameLabel);

      await user.clear(appName);
      await user.tab();
      expect(onSave).toHaveBeenCalledTimes(0);
    });

    it('should toggle error message based on form validation', async () => {
      render(<InputFields {...defaultProps} />);
      const appName = screen.getByLabelText(appNameLabel);
      const errorMessage = textMock('settings_modal.about_tab_name_error');

      await user.clear(appName);
      await user.tab();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      await user.type(appName, mockNewText);
      await user.tab();
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });
});
