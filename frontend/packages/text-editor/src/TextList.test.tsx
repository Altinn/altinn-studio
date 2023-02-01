import React from 'react';
import type { TextResourceMap } from './types';
import userEvent from '@testing-library/user-event';
import type { TextListProps } from './TextList';
import { TextList } from './TextList';
import { screen, render as rtlRender, act } from '@testing-library/react';

const renderTextList = (props: Partial<TextListProps> = {}) => {
  const texts: TextResourceMap = {
    a: {
      value: 'value1',
    },
    b: {
      value: 'value2',
    },
    c: {
      value: 'value3',
    },
    d: {
      value: 'value4',
    },
    e: {
      value: 'value5',
    },
    f: {
      value: 'value6',
    },
  };

  const allProps: TextListProps = {
    textIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    selectedLangCode: 'nb',
    searchQuery: undefined,
    texts,
    updateEntryId: (_arg) => undefined,
    removeEntry: (_arg) => undefined,
    upsertEntry: (_entry) => undefined,
    ...props,
  };
  const user = userEvent.setup();
  return { initPros: allProps, user, ...rtlRender(<TextList {...allProps} />) };
};

describe('TextList', () => {
  test('updateEntryId should be called when id has been changed', async () => {
    const updateEntryId = jest.fn();
    const { user, rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);
    const idInputs = screen.getAllByRole('textbox', {
      name: /id/i,
    });
    await act(() => user.dblClick(idInputs[0]));
    await act(() => user.keyboard('a-updated{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'a-updated', oldId: 'a' });
    await act(() => user.keyboard('{TAB}{TAB}b-updated{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'b-updated', oldId: 'b' });
    await act(() => user.keyboard('{TAB}{TAB}{TAB}{TAB}{TAB}{TAB}{TAB}{TAB}e-updated{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'e-updated', oldId: 'e' });
  });
  test('that the user is warned when an id already exists', async () => {
    const updateEntryId = jest.fn();
    const { user, rerender, initPros } = renderTextList({ updateEntryId });
    rerender(<TextList {...initPros} />);
    const idInputs = screen.getAllByRole('textbox', {
      name: /id/i,
    });
    const errorMsg = 'Denne IDen finnes allerede';
    await act(() => user.dblClick(idInputs[1]));
    await act(() => user.keyboard('a'));
    const error = screen.getByRole('alertdialog');
    expect(error).toBeInTheDocument();
    expect(screen.queryByText(errorMsg)).not.toBeNull();
    await act(() => user.keyboard('2'));
    expect(screen.queryByText(errorMsg)).toBeNull();
    await act(() => user.keyboard('{BACKSPACE}'));
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    await act(() => user.keyboard('{TAB}'));
    expect(updateEntryId).not.toHaveBeenCalled();
    await act(() => user.keyboard('{SHIFT>}{TAB}{/SHIFT}{END}2{TAB}'));
    expect(updateEntryId).toHaveBeenCalledWith({ oldId: 'b', newId: 'a2' });
  });
});
