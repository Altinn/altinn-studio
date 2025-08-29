import React from 'react';
import { screen, render } from '@testing-library/react';
import type { TextEntryProps } from './TextEntry';
import { TextEntry } from './TextEntry';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockUpsertTextResource = jest.fn();
const textEntryValue = '';
const APP_NAME = 'appName';
const textId = APP_NAME;

describe('TextEntry', () => {
  afterEach(jest.clearAllMocks);

  it('should render the TextEntry component', () => {
    renderTextEntry();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it("should not call upsertTextResource when textEntryValue is '' ", async () => {
    const user = userEvent.setup();
    renderTextEntry();
    const inputText1 = getTextArea();
    await user.clear(inputText1);
    expect(mockUpsertTextResource).toHaveBeenCalledTimes(0);
  });

  it("should return nothing when textEntryValue is '' ", async () => {
    const user = userEvent.setup();
    renderTextEntry();
    const inputText2 = getTextArea();
    await user.clear(inputText2);
    expect(textEntryValue).toEqual('');
  });

  it('should toggle validation error message when textEntryValue changes from empty to has value', async () => {
    const user = userEvent.setup();
    renderTextEntry();
    const inputText3 = getTextArea();
    await user.clear(inputText3);
    expect(textId).toEqual(APP_NAME);
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
    await user.type(inputText3, 'Hello');
    expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
  });

  it('shouls not display validation error message when textId equal to APP_NAME but textEntryValue is not empty', async () => {
    const user = userEvent.setup();
    renderTextEntry();
    const inputText4 = getTextArea();
    await user.type(inputText4, 'Hello');
    expect(textId).toEqual(APP_NAME);
    expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
  });
});

const renderTextEntry = async (props: Partial<TextEntryProps> = {}) => {
  const allProps: TextEntryProps = {
    textId: 'appName',
    lang: 'nb',
    translation: 'Hello',
    upsertTextResource: mockUpsertTextResource,
    className: 'text-entry',
    ...props,
  };

  return render(<TextEntry {...allProps} />);
};

const getTextArea = (): HTMLElement => {
  return screen.getByRole('textbox', {
    name: textMock('text_editor.table_row_input_label', {
      lang: textMock('language.nb'),
      textKey: textId,
    }),
  });
};
