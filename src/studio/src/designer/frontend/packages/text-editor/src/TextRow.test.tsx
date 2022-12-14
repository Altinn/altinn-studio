import React from 'react';
import type { ILanguageRowProps } from './TextRow';
import type { TextResourceEntry } from './types';
import userEvent from '@testing-library/user-event';
import { TextRow } from './TextRow';
import { screen, render as rtlRender } from '@testing-library/react';

const renderTextRow = (props: Partial<ILanguageRowProps> = {}) => {
  const textResourceEntry: TextResourceEntry = {
    id: 'key1',
    value: 'value1',
  };

  const allProps = {
    languageName: 'Norsk',
    langCode: 'nb',
    translationKey: 'key1',
    textResourceEntry,
    upsertEntry: jest.fn(),
    removeEntry: jest.fn(),
    idExists: jest.fn(),
    ...props,
  } as ILanguageRowProps;
  const user = userEvent.setup();
  rtlRender(<TextRow {...allProps} />);
  return { user };
};

describe('TextRow', () => {
  test.skip('onIdChange should fire when changing id', async () => {
    const upsertEntry = jest.fn();
    const { user } = renderTextRow({ upsertEntry });
    const idInput = screen.getByRole('textbox', {
      name: /id/i,
    });

    await user.type(idInput, '-updated');
    await user.keyboard('{TAB}');

    expect(upsertEntry).toHaveBeenCalledWith({ newValue: 'key1-updated', oldValue: 'key1' });
  });

  test('onValueChange should fire when changing value', async () => {
    const upsertEntry = jest.fn();
    const { user } = renderTextRow({ upsertEntry });
    const valueInput = screen.getByRole('textbox', {
      name: /norsk/i,
    });

    await user.type(valueInput, '-updated');
    await user.keyboard('{TAB}');

    expect(upsertEntry).toHaveBeenCalledWith({
      id: 'key1',
      value: 'value1-updated',
    });
  });

  test('onTranslationChange should fire when deleting a value', async () => {
    const removeEntry = jest.fn();
    const { user } = renderTextRow({ removeEntry });
    const deleteButton = screen.getByTestId('delete-button');

    await user.click(deleteButton);
    expect(removeEntry).toBeCalledWith('key1');
  });
});
