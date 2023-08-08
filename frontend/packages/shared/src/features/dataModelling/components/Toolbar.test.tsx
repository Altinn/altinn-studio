import React from 'react';
import { act, render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import type { ToolbarProps } from './Toolbar';
import { Toolbar } from './Toolbar';

const user = userEvent.setup();

// Test data:
const deleteText = 'Delete';
const continueText = 'Continue';
const cancelText = 'Cancel';
const confirmText = 'Delete {schemaName}?';
const texts = {
  'schema_editor.delete_model_confirm': confirmText,
  'schema_editor.delete_data_model': deleteText,
  'schema_editor.confirm_deletion': continueText,
  'general.cancel': cancelText,
};

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

const handleCreateSchemaMock = jest.fn();
const handleDeleteSchemaMock = jest.fn();
const handleXsdUploadedMock = jest.fn();
const metadataOptionsMock = [];
const modelNamesMock = [];
const selectedOptionMock = null;
const setCreateNewOpenMock = jest.fn();
const setSelectedOptionMock = jest.fn();

const render = (props?: Partial<ToolbarProps>) => {
  const allProps: ToolbarProps = {
    createNewOpen: false,
    createPathOption: false,
    disabled: false,
    handleCreateSchema: handleCreateSchemaMock,
    handleDeleteSchema: handleDeleteSchemaMock,
    handleXsdUploaded: handleXsdUploadedMock,
    metadataOptions: metadataOptionsMock,
    modelNames: modelNamesMock,
    selectedOption: selectedOptionMock,
    setCreateNewOpen: setCreateNewOpenMock,
    setSelectedOption: setSelectedOptionMock,
    ...props,
  }

  return rtlRender(<Toolbar {...allProps} />);
};

describe('Toolbar', () => {
  afterEach(jest.clearAllMocks);

  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      render();

      const deleteButton = getDeleteButton();
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const description = queryDeleteMessage();
      expect(description).toBeInTheDocument();

      const confirmButton = getContinueButton();
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = getCancelButton();
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      render();

      const deleteButton = getDeleteButton();
      await act(() => user.click(deleteButton));

      const confirmButton = getContinueButton();
      await act(() => user.click(confirmButton));

      expect(handleDeleteSchemaMock).toBeCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      render();

      const deleteButton = getDeleteButton();
      await act(() => user.click(deleteButton));

      const cancelButton = getCancelButton();
      await act(() => user.click(cancelButton));

      expect(handleDeleteSchemaMock).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      render();

      const deleteButton = getDeleteButton();
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(handleDeleteSchemaMock).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: deleteText });
const getContinueButton = () => screen.getByRole('button', { name: continueText });
const getCancelButton = () => screen.getByRole('button', { name: cancelText });
const queryDeleteMessage = () => screen.queryByText(confirmText);
