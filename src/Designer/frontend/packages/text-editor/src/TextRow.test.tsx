import React from 'react';
import type { TextRowProps } from './TextRow';
import userEvent from '@testing-library/user-event';
import { TextRow } from './TextRow';
import { screen, render as rtlRender, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { TextTableRowEntry } from './types';
import { Table, TableBody } from '@digdir/designsystemet-react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';

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
      <ServicesContextProvider {...queriesMock} client={queryClientMock}>
        <Table>
          <TableBody>
            <TextRow {...allProps} />
          </TableBody>
        </Table>
      </ServicesContextProvider>,
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

    await user.type(valueInput, '-updated');
    await user.keyboard('{TAB}');

    expect(upsertTextResource).toHaveBeenCalledWith({
      language: 'nb',
      textId: textKey,
      translation: 'value1-updated',
    });
  });

  test('renders button to delete text and button to edit text key by default', () => {
    renderTextRow();
    screen.getByRole('button', { name: textMock('text_editor.toggle_edit_mode', { textKey }) });
    screen.getByRole('button', { name: textMock('schema_editor.delete') });
  });

  test('does not show button to delete text when showDeleteButton is false', () => {
    renderTextRow({ showDeleteButton: false });
    screen.getByRole('button', { name: textMock('text_editor.toggle_edit_mode', { textKey }) });
    const deleteButton = screen.queryByRole('button', {
      name: textMock('schema_editor.delete'),
    });
    expect(deleteButton).not.toBeInTheDocument();
  });

  test('does not show button to edit text key when showEditButton is false', () => {
    renderTextRow({ showEditButton: false });
    screen.getByRole('button', { name: textMock('schema_editor.delete') });
    const editButton = screen.queryByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey }),
    });
    expect(editButton).not.toBeInTheDocument();
  });

  test('that the user is warned if an illegal character is used', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    renderTextRow({ updateEntryId });
    const toggleKeyEditButton = screen.getByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey }),
    });
    await user.click(toggleKeyEditButton);

    const idInput = screen.getByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey }),
    });
    const emptyMsg = textMock('text_editor.key.error_empty');
    const illegalCharMsg = textMock('text_editor.key.error_invalid');
    await user.dblClick(idInput);
    await user.keyboard('{BACKSPACE}');
    expect(screen.getByText(emptyMsg)).not.toBeNull();
    await user.keyboard('2');
    expect(screen.queryByText(emptyMsg)).toBeNull();
    await user.keyboard(' ');
    expect(screen.getByText(illegalCharMsg)).toBeInTheDocument();
  });

  it('should not stop a call to upsertEntry to update key when new text key is equal the original but with some uppercase', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    renderTextRow({ updateEntryId });
    const toggleKeyEditButton = screen.getByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey }),
    });
    await user.click(toggleKeyEditButton);

    const idInput = screen.getByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey }),
    });

    await user.type(idInput, 'Value1');
    await user.keyboard('{TAB}');
    expect(updateEntryId).toHaveBeenCalledTimes(1);
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
      await user.click(deleteButton);

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
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', {
        name: textMock('schema_editor.textRow-deletion-confirm'),
      });
      await user.click(confirmButton);

      expect(removeEntry).toHaveBeenCalledWith({ textId: 'key1' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });

      const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await user.click(cancelButton);

      expect(removeEntry).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });

      const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
      await user.click(deleteButton);

      await user.click(document.body);

      expect(removeEntry).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
