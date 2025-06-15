import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranslationDetails } from './TranslationDetails';
import type { TranslationDetailsProps } from './TranslationDetails';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppResourceFormError } from 'app-shared/types/AppResource';

describe('TranslationDetails', () => {
  afterEach(jest.clearAllMocks);

  it('renders StudioTextfields for both languages with correct labels', () => {
    renderTranslationDetails();

    const nnField = getTextbox(`${label} (${textMock('language.nn')})`);
    expect(nnField).toBeInTheDocument();

    const enField = getTextbox(`${label} (${textMock('language.en')})`);
    expect(enField).toBeInTheDocument();
  });

  it('displays error messages for both fields when provided', () => {
    const nnError: string = 'NN Error';
    const enError: string = 'EN Error';
    const validationErrors: AppResourceFormError[] = [
      { field: 'serviceName', error: nnError, index: 'nn' },
      { field: 'serviceName', error: enError, index: 'en' },
    ];

    renderTranslationDetails({ errors: validationErrors });

    expect(getText(nnError)).toBeInTheDocument();
    expect(getText(enError)).toBeInTheDocument();
  });

  it.each(['nn', 'en'])('calls onChange with updated value for %s', async (lang) => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    renderTranslationDetails({ onChange });

    const input = getTextbox(`${label} (${textMock(`language.${lang}`)})`);
    await user.clear(input);

    const newText: string = 'A';
    await user.type(input, newText);

    expect(onChange).toHaveBeenLastCalledWith({ ...defaultProps.value, [lang]: newText });
  });

  it('toggles details open state when StudioDetails is clicked', async () => {
    const user = userEvent.setup();
    renderTranslationDetails();

    const detailsLabel = textMock('app_settings.about_tab_language_translation_header', {
      field: label,
    });
    const button = getButton(detailsLabel);
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

const label = textMock('some_label_translation');

const defaultProps: TranslationDetailsProps = {
  label,
  value: { nb: 'Tjeneste', nn: '', en: '' },
  onChange: jest.fn(),
  errors: [],
  id: 'test-id',
};

function renderTranslationDetails(props: Partial<TranslationDetailsProps> = {}) {
  return render(<TranslationDetails {...defaultProps} {...props} />);
}

const getTextbox = (name: string): HTMLInputElement => screen.getByRole('textbox', { name });
const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
