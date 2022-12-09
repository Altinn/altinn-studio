import React from 'react';
import { TextRow } from './TextRow';
import type { LanguageRowProps } from './TextRow';
import { screen, render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
describe('TextRow', () => {
  const user = userEvent.setup();

  test('onIdChange should fire when changing id', async () => {
    const handleIdChange = jest.fn();
    render({ onTextIdChange: handleIdChange });
    const idInput = screen.getByRole('textbox', {
      name: /id/i,
    });

    await user.type(idInput, '-updated');
    await user.keyboard('{TAB}');

    expect(handleIdChange).toHaveBeenCalledWith({ newValue: 'key1-updated', oldValue: 'key1' });
  });

  test('onValueChange should fire when changing value', async () => {
    const handleValueChange = jest.fn();
    render({ onValueChange: handleValueChange });
    const valueInput = screen.getByRole('textbox', {
      name: /norsk/i,
    });

    await user.type(valueInput, '-updated');
    await user.keyboard('{TAB}');

    expect(handleValueChange).toHaveBeenCalledWith({
      newValue: 'value1-updated',
      translationKey: 'key1',
    });
  });

  test('onTranslationChange should fire when deleting a value', async () => {
    const handleTranslationChange = jest.fn();
    render({ onDeleteText: handleTranslationChange });
    const deleteButton = screen.getByTestId('delete-button');

    await user.click(deleteButton);
    expect(handleTranslationChange).toBeCalledWith({
      translations: { key2: 'value2' },
    });
  });

  const render = (props: Partial<LanguageRowProps> = {}) => {
    const translations = {
      key1: 'value1',
      key2: 'value2',
    };
    const allProps = {
      languageName: 'Norsk',
      langCode: 'nb',
      translationKey: 'key1',
      translations,
      onTextIdChange: jest.fn(),
      onValueChange: jest.fn(),
      onDeleteText: jest.fn(),
      ...props,
    } as LanguageRowProps;

    rtlRender(<TextRow {...allProps} />);
  };
});
