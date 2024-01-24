import React from 'react';
import userEvent from '@testing-library/user-event';
import type { TextListProps } from './TextList';
import { TextList } from './TextList';
import { screen, render as rtlRender, act } from '@testing-library/react';
import type { TextTableRow } from './types';

const renderTextList = (props: Partial<TextListProps> = {}) => {
  const resourceRows: TextTableRow[] = [
    {
      textKey: 'a',
      translations: [
        {
          lang: 'nb',
          translation: 'value1',
        },
      ],
    },
    {
      textKey: 'b',
      translations: [
        {
          lang: 'nb',
          translation: 'value2',
        },
      ],
    },
    {
      textKey: 'c',
      translations: [
        {
          lang: 'nb',
          translation: 'value3',
        },
      ],
    },
    {
      textKey: 'd',
      translations: [
        {
          lang: 'nb',
          translation: 'value4',
        },
      ],
    },
  ];

  const allProps: TextListProps = {
    resourceRows,
    searchQuery: undefined,
    updateEntryId: (_arg) => undefined,
    removeEntry: (_arg) => undefined,
    upsertTextResource: (_entry) => undefined,
    selectedLanguages: ['nb', 'en', 'nn'],
    ...props,
  };

  return { initPros: allProps, ...rtlRender(<TextList {...allProps} />) };
};

describe('TextList', () => {
  test('updateEntryId should be called when id has been changed', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const { rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);
    const toggleEditButton = screen.getAllByRole('button', { name: 'toggle-textkey-edit' });
    await act(() => user.click(toggleEditButton[0]));
    const idInputs = screen.getAllByRole('textbox', {
      name: 'tekst key edit',
    });
    await act(() => user.dblClick(idInputs[0]));
    await act(() => user.keyboard('a-updated{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'a-updated', oldId: 'a' });
  });

  test('that the user is warned when an id already exists', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const { rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);
    const toggleEditButton = screen.getAllByRole('button', { name: 'toggle-textkey-edit' });
    await act(() => user.click(toggleEditButton[0]));
    const idInputs = screen.getAllByRole('textbox', {
      name: 'tekst key edit',
    });
    const errorMsg = 'Denne IDen finnes allerede';
    await act(() => user.dblClick(idInputs[0]));
    await act(() => user.keyboard('b'));
    const error = screen.getByRole('alertdialog');
    expect(error).toBeInTheDocument();
    expect(screen.getByText(errorMsg)).not.toBeNull();
    await act(() => user.keyboard('2'));
    expect(screen.queryByText(errorMsg)).toBeNull();
    await act(() => user.keyboard('{BACKSPACE}'));
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    await act(() => user.keyboard('{TAB}'));
    expect(updateEntryId).not.toHaveBeenCalled();
    await act(() => user.keyboard('{SHIFT>}{TAB}{/SHIFT}{END}2{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ oldId: 'a', newId: 'b2' });
  });
});
