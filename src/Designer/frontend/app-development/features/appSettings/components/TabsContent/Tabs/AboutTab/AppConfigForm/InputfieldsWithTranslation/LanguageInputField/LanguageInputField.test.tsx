import React from 'react';
import { render, screen } from '@testing-library/react';
import { LanguageInputField } from './LanguageInputField';
import type { LanguageInputFieldProps } from './LanguageInputField';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('LanguageInputField', () => {
  afterEach(jest.clearAllMocks);

  it('renders a textfield when isTextArea is false', () => {
    renderLanguageInputField({ isTextArea: false });

    const textbox = getTextbox(`${label} ${tagTextOptional}`);
    expect(textbox).toBeInTheDocument();
    expect(textbox.tagName.toLowerCase()).toBe('input');
  });

  it('renders a textarea when isTextArea is true', () => {
    renderLanguageInputField({ isTextArea: true, tagText: tagTextRequired });

    const textbox = getTextbox(`${label} ${tagTextRequired}`);
    expect(textbox).toBeInTheDocument();
    expect(textbox.tagName.toLowerCase()).toBe('textarea');
    expect(textbox).toHaveAttribute('rows', '3');
  });

  it('calls onChange when typing into the field', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderLanguageInputField({ onChange, tagText: tagTextRequired });

    const input = getTextbox(`${label} ${tagTextRequired}`);
    const newValue: string = 'abc';
    await user.type(input, newValue);

    expect(onChange).toHaveBeenCalledTimes(newValue.length);
  });

  it('displays error messages if present', () => {
    const error = 'This is an error';
    renderLanguageInputField({ error: [error] });

    expect(getText(error)).toBeInTheDocument();
  });
});

const label: string = textMock('my_label');
const description: string = textMock('my_description');
const tagTextRequired: string = textMock('general.required');
const tagTextOptional: string = textMock('general.optional');
const initialValue: string = 'Test value';

const defaultProps = {
  id: 'some-id',
  label,
  description,
  value: initialValue,
  onChange: jest.fn(),
  required: true,
  error: [],
  tagText: tagTextOptional,
};

function renderLanguageInputField(props: Partial<LanguageInputFieldProps> = {}) {
  return render(<LanguageInputField {...defaultProps} {...props} />);
}

const getTextbox = (name: string): HTMLInputElement | HTMLTextAreaElement =>
  screen.getByRole('textbox', { name });

const getText = (text: string): HTMLElement => screen.getByText(text);
