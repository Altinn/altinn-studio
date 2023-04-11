import React from 'react';
import type { TextRowProps } from './TextRow';
import userEvent from '@testing-library/user-event';
import { TextRow } from './TextRow';
import { screen, render as rtlRender, waitFor, act } from '@testing-library/react';
import { textMock } from '../../../testing/mocks/i18nMock';
import { TextTableRowEntry } from './types';
import { Table, TableBody } from '@digdir/design-system-react';

describe('TextRow', () => {
  const renderTextRow = (props: Partial<TextRowProps> = {}) => {
    const textRowEntries: TextTableRowEntry[] = [
      {
        lang: 'nb',
        translation: 'value1',
      },
    ];

    const allProps: TextRowProps = {
      idExists: (_arg) => false,
      removeEntry: (_args) => undefined,
      textId: 'key1',
      textRowEntries,
      variables: [],
      updateEntryId: (_args) => undefined,
      upsertTextResource: (_args) => undefined,
      ...props,
    };
    const user = userEvent.setup();
    rtlRender(
      <Table>
        <TableBody>
          <TextRow {...allProps} />
        </TableBody>
      </Table>
    );
    return { user };
  };

  test('Popover should be closed when the user clicks the cancel button', async () => {
    const { user } = renderTextRow();

    const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
    await act(() => user.click(deleteButton));

    const cancelPopoverButton = screen.getByRole('button', {
      name: textMock('schema_editor.textRow-cancel-popover'),
    });
    await act(() => user.click(cancelPopoverButton));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('upsertEntry should be called when changing text', async () => {
    const upsertTextResource = jest.fn();
    const { user } = renderTextRow({ upsertTextResource });
    const valueInput = screen.getByRole('textbox', {
      name: 'nb translation',
    });

    await act(() => user.type(valueInput, '-updated'));
    await act(() => user.keyboard('{TAB}'));

    expect(upsertTextResource).toHaveBeenCalledWith({
      language: 'nb',
      textId: 'key1',
      translation: 'value1-updated',
    });
  });

  test('Popover should be shown when the user clicks the delete button', async () => {
    const { user } = renderTextRow();
    const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
    await act(() => user.click(deleteButton));
    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
  });

  test('removeEntry should be called when deleting an entry', async () => {
    const removeEntry = jest.fn();
    const { user } = renderTextRow({ removeEntry });
    const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
    await act(() => user.click(deleteButton));
    const confirmDeleteButton = screen.getByRole('button', {
      name: /schema_editor.textRow-confirm-cancel-popover/,
    });
    await act(() => user.click(confirmDeleteButton));
    expect(removeEntry).toBeCalledWith({ textId: 'key1' });
  });

  test('that the user is warned if an illegal character is used', async () => {
    const updateEntryId = jest.fn();
    const { user } = renderTextRow({ updateEntryId });
    const toggleKeyEditButton = screen.getByRole('button', {
      name: 'toggle-textkey-edit',
    });
    await act(() => user.click(toggleKeyEditButton));

    const idInput = screen.getByRole('textbox', {
      name: 'tekst key edit',
    });
    const emptyMsg = 'TextId kan ikke være tom';
    const illegalCharMsg = 'Det er ikke tillat med mellomrom i en textId';
    await act(() => user.dblClick(idInput));
    await act(() => user.keyboard('{BACKSPACE}'));
    const error = screen.getByRole('alertdialog');
    expect(error).toBeInTheDocument();
    expect(screen.getByText(emptyMsg)).not.toBeNull();
    await act(() => user.keyboard('2'));
    expect(screen.queryByText(emptyMsg)).toBeNull();
    await act(() => user.keyboard(' '));
    expect(screen.getByText(illegalCharMsg)).toBeInTheDocument();
  });
});
