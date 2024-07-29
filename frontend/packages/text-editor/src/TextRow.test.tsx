import React from 'react';
import type { TextRowProps } from './TextRow';
import userEvent from '@testing-library/user-event';
import { TextRow } from './TextRow';
import { screen, render as rtlRender } from '@testing-library/react';
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
    screen.getByRole('button', { name: textMock('general.delete') });
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
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const user = userEvent.setup();
      renderTextRow();
      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);
      expect(window.confirm).toHaveBeenCalledWith(textMock('schema_editor.textRow-deletion-text'));
    });

    it('Calls onDelete when the user clicks the delete button and confirms', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });
      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);
      expect(removeEntry).toHaveBeenCalledWith({ textId: 'key1' });
    });

    it('Should not call onDelete when clicking Cancel in confirm window', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();
      const removeEntry = jest.fn();
      renderTextRow({ removeEntry });
      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);
      expect(removeEntry).toHaveBeenCalledTimes(0);
    });
  });
});
