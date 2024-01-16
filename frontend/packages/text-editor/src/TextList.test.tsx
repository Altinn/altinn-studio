import React from 'react';
import userEvent from '@testing-library/user-event';
import type { TextListProps } from './TextList';
import { TextList } from './TextList';
import { screen, render as rtlRender, act } from '@testing-library/react';
import { TextTableRow } from './types';

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
  it('should call updateEntryId when the ID is changed in the edit mode', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const { rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);

    const toggleEditButton = screen.getAllByRole('button', { name: 'toggle-textkey-edit' });
    await act(() => user.click(toggleEditButton[0]));
    const idInput = screen.getByRole('textbox', { name: 'text key edit' });

    await act(() => user.dblClick(idInput));
    await act(() => user.keyboard('a-updated{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'a-updated', oldId: 'a' });
  });

  it('should display warnings for existing, empty, or space-containing IDs', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const { rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);

    const toggleEditButton = screen.getAllByRole('button', { name: 'toggle-textkey-edit' });
    await act(() => user.click(toggleEditButton[0]));

    const idInput = screen.getByRole('textbox', { name: 'text key edit' });
    const errorMsg = [
      'Denne IDen finnes allerede',
      'Det er ikke tillat med mellomrom i en textId',
      'TextId kan ikke være tom',
    ];
    await act(() => user.dblClick(idInput));

    await act(() => user.keyboard('b'));
    expect(screen.getByText(errorMsg[0])).not.toBeNull();

    await act(() => user.keyboard('2'));
    expect(screen.queryByText(errorMsg[0])).toBeNull();

    await act(() => user.keyboard(' '));
    expect(screen.getByText(errorMsg[1])).not.toBeNull();

    await act(() => user.clear(idInput));
    expect(screen.getByText(errorMsg[2])).not.toBeNull();

    await act(() => user.keyboard('{TAB}'));
    expect(updateEntryId).not.toHaveBeenCalled();

    await act(() => user.keyboard('{SHIFT>}{TAB}{/SHIFT}{END}2{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ oldId: 'a', newId: '2' });
  });
});
