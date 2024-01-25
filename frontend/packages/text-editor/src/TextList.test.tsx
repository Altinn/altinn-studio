import React from 'react';
import userEvent from '@testing-library/user-event';
import type { TextListProps } from './TextList';
import { TextList } from './TextList';
import { screen, render as rtlRender, act } from '@testing-library/react';
import { TextTableRow } from './types';
import { textMock } from '../../../testing/mocks/i18nMock';

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

    const toggleEditButton = screen.getAllByRole('button', {
      name: textMock('text_editor.toggle_edit_mode'),
    });
    await act(() => user.click(toggleEditButton[0]));
    const idInput = screen.getByRole('textbox', { name: textMock('text_editor.key.edit') });

    await act(() => user.dblClick(idInput));
    await act(() => user.keyboard('a-updated{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'a-updated', oldId: 'a' });
  });

  it('should display warnings for existing, empty, or space-containing IDs', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const [firstErrorMessage, secondErrorMessage, thirdErrorMessage]: string[] = [
      textMock('text_editor.key.error_duplicate'),
      textMock('text_editor.key.error_invalid'),
      textMock('text_editor.key.error_empty'),
    ];
    const { rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);

    const toggleEditButton = screen.getAllByRole('button', {
      name: textMock('text_editor.toggle_edit_mode'),
    });
    await act(() => user.click(toggleEditButton[0]));

    const idInput = screen.getByRole('textbox', { name: textMock('text_editor.key.edit') });
    await act(() => user.dblClick(idInput));

    await act(() => user.keyboard('b'));
    expect(screen.getByText(firstErrorMessage)).not.toBeNull();

    await act(() => user.keyboard('2'));
    expect(screen.queryByText(firstErrorMessage)).toBeNull();

    await act(() => user.keyboard(' '));
    expect(screen.getByText(secondErrorMessage)).not.toBeNull();

    await act(() => user.clear(idInput));
    expect(screen.getByText(thirdErrorMessage)).not.toBeNull();

    await act(() => user.keyboard('{TAB}'));
    expect(updateEntryId).not.toHaveBeenCalled();

    //Back to the original value, no error should be displayed
    await act(() => user.type(idInput, 'a'));
    expect(screen.queryByText(firstErrorMessage)).toBeNull();
    expect(screen.queryByText(secondErrorMessage)).toBeNull();
    expect(screen.queryByText(thirdErrorMessage)).toBeNull();

    await act(() => user.keyboard('2{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ oldId: 'a', newId: 'a2' });
  });
});
