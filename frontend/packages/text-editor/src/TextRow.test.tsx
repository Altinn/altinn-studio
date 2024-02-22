import React from 'react';
import userEvent from '@testing-library/user-event';
import { TextRow, type TextRowProps } from './TextRow';
import { screen, render as rtlRender, waitFor, act } from '@testing-library/react';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { TextTableRowEntry } from './types';
import { Table, TableBody } from '@digdir/design-system-react';

const textKey: string = 'key1';

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
      textId: textKey,
      textRowEntries,
      variables: [],
      updateEntryId: (_args) => undefined,
      upsertTextResource: (_args) => undefined,
      selectedLanguages: ['nb', 'en', 'nn'],
      ...props,
    };

    rtlRender(
      <Table>
        <TableBody>
          <TextRow {...allProps} />
        </TableBody>
      </Table>,
    );
  };

  test('upsertEntry should be called when changing text', async () => {
    const user = userEvent.setup();
    const upsertTextResource = jest.fn();
    renderTextRow({ upsertTextResource });
    const valueInput = screen.getByRole('textbox', {
      name: textMock('text_editor.table_row_input_label', {
        lang: textMock('language.nb'),
        textKey,
      }),
    });

    await act(() => user.type(valueInput, '-updated'));
    await act(() => user.keyboard('{TAB}'));

    expect(upsertTextResource).toHaveBeenCalledWith({
      language: 'nb',
      textId: textKey,
      translation: 'value1-updated',
    });
  });

  test('renders a Button component with a PencilIcon when showButton is true', () => {
    renderTextRow({ showButton: true });
    const button = screen.getByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey }),
    });
    expect(button).toBeInTheDocument();
  });

  test('Hide a Button component with a PencilIcon when showButton is false', () => {
    renderTextRow({ showButton: false });
    const button = screen.queryByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey }),
    });
    expect(button).not.toBeInTheDocument();
  });

  test('that the user is warned if an illegal character is used', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    renderTextRow({ updateEntryId });
    const toggleKeyEditButton = screen.getByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey }),
    });
    await act(() => user.click(toggleKeyEditButton));

    const idInput = screen.getByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey }),
    });
    const emptyMsg = textMock('text_editor.key.error_empty');
    const illegalCharMsg = textMock('text_editor.key.error_invalid');
    await act(() => user.dblClick(idInput));
    await act(() => user.keyboard('{BACKSPACE}'));
    expect(screen.getByText(emptyMsg)).not.toBeNull();
    await act(() => user.keyboard('2'));
    expect(screen.queryByText(emptyMsg)).toBeNull();
    await act(() => user.keyboard(' '));
    expect(screen.getByText(illegalCharMsg)).toBeInTheDocument();
  });

  test('that the full row of languages is shown even if a translation is missing', async () => {
    renderTextRow({
      textRowEntries: [
        {
          lang: 'nb',
          translation: 'Dette er en tekst',
        },
        {
          lang: 'nn',
          translation: 'Dette er en tekst',
        },
      ],
    });
    const textFields = await screen.findAllByRole('textbox');
    expect(textFields.length).toBe(3);
  });

  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      const user = userEvent.setup();
      renderTextRow();

      const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(textMock('schema_editor.textRow-deletion-text'));
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: textMock('schema_editor.textRow-deletion-confirm'),
      });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });

      const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', {
        name: textMock('schema_editor.textRow-deletion-confirm'),
      });
      await act(() => user.click(confirmButton));

      expect(removeEntry).toHaveBeenCalledWith({ textId: 'key1' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });

      const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      expect(removeEntry).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });

      const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(removeEntry).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
