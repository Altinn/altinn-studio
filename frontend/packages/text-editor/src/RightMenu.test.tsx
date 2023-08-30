import React from 'react';
import { screen, waitFor, render as rtlRender, act } from '@testing-library/react';
import { RightMenu } from './RightMenu';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';
import * as testids from '../../../testing/testids';

const user = userEvent.setup();

describe('RightMenu', () => {
  const mockAddLanguage = jest.fn();
  const mockDeleteLanguage = jest.fn();
  const defaultProps = {
    addLanguage: mockAddLanguage,
    availableLanguages: ['en', 'fr'],
    deleteLanguage: mockDeleteLanguage,
    selectedLanguages: ['en'],
    setSelectedLanguages: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const render = async () => {
    rtlRender(<RightMenu {...defaultProps} />);
    await waitFor(() => { expect(screen.getByRole('combobox')).toBeInTheDocument(); });
  }

  describe('Delete confirmation dialog', () => {
    it('should open the confirmation dialog when clicking the delete button', async () => {
      await render();

      const deleteButton = screen.getByTestId(testids.deleteButton('en'));
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(textMock('schema_editor.language_display_confirm_delete'));
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: textMock('schema_editor.language_confirm_deletion') });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      await render();

      const deleteButton = screen.getByTestId(testids.deleteButton('en'));
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', { name: textMock('schema_editor.language_confirm_deletion') });
      await act(() => user.click(confirmButton));

      expect(defaultProps.deleteLanguage).toBeCalledWith('en');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      await render();

      const deleteButton = screen.getByTestId(testids.deleteButton('en'));
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      expect(defaultProps.deleteLanguage).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      await render();

      const deleteButton = screen.getByTestId(testids.deleteButton('en'));
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(defaultProps.deleteLanguage).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
