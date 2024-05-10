import React from 'react';
import { render as renderRtl, screen, waitFor } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { CreateNewWrapperProps } from './CreateNewWrapper';
import { CreateNewWrapper } from './CreateNewWrapper';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import {
  datamodel1NameMock,
  jsonMetadata1Mock,
} from '../../../../../packages/schema-editor/test/mocks/metadataMocks';

const user = userEvent.setup();

// Test data:
const handleCreateSchema = jest.fn();
const setCreateNewOpen = jest.fn();
const defaultProps: CreateNewWrapperProps = {
  createNewOpen: false,
  dataModels: [],
  disabled: false,
  handleCreateSchema,
  setCreateNewOpen,
};

describe('CreateNewWrapper', () => {
  afterEach(jest.clearAllMocks);

  it('should open the popup when clicking "new" button', async () => {
    render();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: textMock('schema_editor.create_model_confirm_button'),
      }),
    ).not.toBeInTheDocument();

    const newButton = screen.getByRole('button', {
      name: textMock('general.create_new'),
    });
    user.click(newButton);

    await waitFor(() => expect(setCreateNewOpen).toHaveBeenCalledTimes(1));
    expect(setCreateNewOpen).toHaveBeenCalledWith(true);
  });

  it('should close the popup when clicking "new" button', async () => {
    render({ createNewOpen: true });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('schema_editor.create_model_confirm_button'),
      }),
    ).toBeInTheDocument();

    const newButton = screen.getByRole('button', {
      name: textMock('general.create_new'),
    });

    user.click(newButton);
    await waitFor(() => expect(setCreateNewOpen).toHaveBeenCalledTimes(1));
    expect(setCreateNewOpen).toHaveBeenCalledWith(false);
  });

  describe('createAction', () => {
    it('should call handleCreateSchema callback when ok button is clicked', async () => {
      render({ createNewOpen: true });

      const textInput = screen.getByRole('textbox');
      const okButton = screen.getByRole('button', {
        name: textMock('schema_editor.create_model_confirm_button'),
      });
      await waitFor(() => user.type(textInput, 'new-model'));
      user.click(okButton);
      await waitFor(() =>
        expect(handleCreateSchema).toHaveBeenCalledWith({
          name: 'new-model',
          relativePath: undefined,
        }),
      );
    });

    it('should call handleCreateSchema callback when input is focused and Enter key is pressed', async () => {
      render({ createNewOpen: true });

      const textInput = screen.getByRole('textbox');

      await waitFor(() => user.type(textInput, 'new-model'));
      user.keyboard('{Enter}');
      await waitFor(() =>
        expect(handleCreateSchema).toHaveBeenCalledWith({
          name: 'new-model',
          relativePath: undefined,
        }),
      );
    });

    it('should call handleCreateSchema callback with relativePath when createPathOption is set and ok button is clicked', async () => {
      render({ createNewOpen: true, createPathOption: true });

      const textInput = screen.getByRole('textbox');
      const okButton = screen.getByRole('button', {
        name: textMock('schema_editor.create_model_confirm_button'),
      });
      await waitFor(() => user.type(textInput, 'new-model'));
      user.click(okButton);
      await waitFor(() =>
        expect(handleCreateSchema).toHaveBeenCalledWith({
          name: 'new-model',
          relativePath: '',
        }),
      );
    });

    it('should not call handleCreateSchema callback and show error message when trying to create a new model with the same name as an existing one when ok button is clicked', async () => {
      const newModelName = datamodel1NameMock;
      const errMessage = textMock('schema_editor.error_model_name_exists', { newModelName });
      render({ createNewOpen: true, dataModels: [jsonMetadata1Mock] });

      const textInput = screen.getByRole('textbox');
      const okButton = screen.getByRole('button', {
        name: textMock('schema_editor.create_model_confirm_button'),
      });

      await waitFor(() => user.type(textInput, newModelName));
      expect(screen.queryByText(errMessage)).not.toBeInTheDocument();

      user.click(okButton);

      expect(handleCreateSchema).not.toHaveBeenCalled();
      const errMessageElement = await screen.findByText(errMessage);
      expect(errMessageElement).toBeInTheDocument();
    });

    it('should not call handleCreateSchema callback when trying to create a new model with no name when ok button is clicked', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      render({ createNewOpen: true, dataModels: [jsonMetadata1Mock] });

      const okButton = screen.getByRole('button', {
        name: textMock('schema_editor.create_model_confirm_button'),
      });

      userWithNoPointerEventCheck.click(okButton);

      expect(handleCreateSchema).not.toHaveBeenCalled();
    });
  });
});

const render = (props: Partial<CreateNewWrapperProps> = {}) =>
  renderRtl(<CreateNewWrapper {...defaultProps} {...props} />);
