import React from 'react';
import type { LangRowProps } from './TextRow';
import type { TextDetail } from './types';
import userEvent from '@testing-library/user-event';
import { TextRow } from './TextRow';
import { screen, render as rtlRender, waitFor } from '@testing-library/react';
import { mockUseTranslation } from '../../../testing/mocks/i18nMock';
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation() }));

describe('TextRow', () => {
  const renderTextRow = (props: Partial<LangRowProps> = {}) => {
    const textData: TextDetail = {
      value: 'value1',
    };

    const allProps: LangRowProps = {
      textId: 'key1',
      langName: 'Norsk',
      textData,
      upsertEntry: (_args) => undefined,
      removeEntry: (_args) => undefined,
      updateEntryId: (_args) => undefined,
      idExists: (_arg) => false,
      ...props,
    };
    const user = userEvent.setup();
    rtlRender(<TextRow {...allProps} />);
    return { user };
  };

  test('Popover should be closed when the user clicks the cancel button', async () => {
    const { user } = renderTextRow();

    const deleteButton = screen.getByRole('button', { name: /Slett/ });
    await user.click(deleteButton);

    const cancelPopoverButton = screen.getByRole('button', {
      name: /chema_editor.textRow-cancel-popover/,
    });
    await user.click(cancelPopoverButton);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('upsertEntry should be called when changing text', async () => {
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

  test('Popover should be shown when the user clicks the delete button', async () => {
    const { user } = renderTextRow();
    const deleteButton = screen.getByRole('button', { name: /Slett/ });
    await user.click(deleteButton);
    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
  });

  test('removeEntry should be called when deleting an entry', async () => {
    const removeEntry = jest.fn();
    const { user } = renderTextRow({ removeEntry });
    const deleteButton = screen.getByRole('button', { name: /Slett/ });
    await user.click(deleteButton);
    const confirmDeleteButton = screen.getByRole('button', {
      name: /schema_editor.textRow-confirm-cancel-popover/,
    });
    await user.click(confirmDeleteButton);
    expect(removeEntry).toBeCalledWith({ textId: 'key1' });
  });

  test('that the user is warned if an illegal character is used', async () => {
    const updateEntryId = jest.fn();
    const { user } = renderTextRow({ updateEntryId });
    const idInput = screen.getByRole('textbox', {
      name: /id/i,
    });
    const emptyMsg = 'TextId kan ikke være tom';
    const illegalCharMsg = 'Det er ikke tillat med mellomrom i en textId';
    await user.dblClick(idInput);
    await user.keyboard('{BACKSPACE}');
    const error = screen.getByRole('alertdialog');
    expect(error).toBeInTheDocument();
    expect(screen.getByText(emptyMsg)).not.toBeNull();
    await user.keyboard('2');
    expect(screen.queryByText(emptyMsg)).toBeNull();
    await user.keyboard(' ');
    expect(screen.getByText(illegalCharMsg)).toBeInTheDocument();
  });
  test('that the text area has 3 rows', async () => {
    renderTextRow();
    const valueInput = screen.getByRole('textbox', {
      name: /norsk/i,
    });
    expect((valueInput as HTMLTextAreaElement).rows).toEqual(3);
  });
});
