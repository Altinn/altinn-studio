import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { CreateNewWrapperProps } from './CreateNewWrapper';
import { CreateNewWrapper } from './CreateNewWrapper';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  dataModel1NameMock,
  jsonMetadata1Mock,
} from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { renderWithProviders } from '../../../../test/testUtils';
import { app, org } from '@studio/testing/testids';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

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
    const user = userEvent.setup();
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
    await user.click(newButton);

    expect(setCreateNewOpen).toHaveBeenCalledTimes(1);
    expect(setCreateNewOpen).toHaveBeenCalledWith(true);
  });

  it('should close the popup when clicking "new" button', async () => {
    const user = userEvent.setup();
    render({ createNewOpen: true });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(okButton()).toBeInTheDocument();

    const newButton = screen.getByRole('button', {
      name: textMock('general.create_new'),
    });

    await user.click(newButton);
    expect(setCreateNewOpen).toHaveBeenCalledTimes(1);
    expect(setCreateNewOpen).toHaveBeenCalledWith(false);
  });

  describe('createAction', () => {
    it('should call handleCreateSchema callback when ok button is clicked', async () => {
      const user = userEvent.setup();
      render({ createNewOpen: true });

      const textInput = screen.getByRole('textbox');
      await user.type(textInput, 'new-model');
      await user.click(okButton());
      expect(handleCreateSchema).toHaveBeenCalledWith({
        name: 'new-model',
        relativePath: undefined,
      });
    });

    it('should call handleCreateSchema callback when input is focused and Enter key is pressed', async () => {
      const user = userEvent.setup();
      render({ createNewOpen: true });

      const textInput = screen.getByRole('textbox');

      await user.type(textInput, 'new-model');
      await user.keyboard('{Enter}');
      expect(handleCreateSchema).toHaveBeenCalledWith({
        name: 'new-model',
        relativePath: undefined,
      });
    });

    it('should call handleCreateSchema callback with relativePath when createPathOption is set and ok button is clicked', async () => {
      const user = userEvent.setup();
      render({ createNewOpen: true, createPathOption: true });

      const textInput = screen.getByRole('textbox');
      await user.type(textInput, 'new-model');
      await user.click(okButton());
      expect(handleCreateSchema).toHaveBeenCalledWith({
        name: 'new-model',
        relativePath: '',
      });
    });

    it('should not call handleCreateSchema callback and show error message when trying to create a new model with the same name as an existing one when ok button is clicked', async () => {
      const user = userEvent.setup();
      const newModelName = dataModel1NameMock;
      const errMessage = textMock('schema_editor.error_model_name_exists', { newModelName });
      render({ createNewOpen: true, dataModels: [jsonMetadata1Mock] });

      const textInput = screen.getByRole('textbox');

      expect(screen.queryByText(errMessage)).not.toBeInTheDocument();
      await user.type(textInput, newModelName);

      expect(okButton()).toBeDisabled();
      expect(handleCreateSchema).not.toHaveBeenCalled();
      expect(screen.getByText(errMessage)).toBeInTheDocument();
    });

    it('should not call handleCreateSchema callback when trying to create a new model with no name when ok button is clicked', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      render({ createNewOpen: true, dataModels: [jsonMetadata1Mock] });

      await userWithNoPointerEventCheck.click(okButton());

      expect(handleCreateSchema).not.toHaveBeenCalled();
    });

    it('should not allow a name already in use in applicationmetadata json file', async () => {
      const user = userEvent.setup();

      const dataTypeName = 'testmodel';
      const queryClient = createQueryClientMock();
      queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
        dataTypes: [{ id: dataTypeName }],
      });
      render({ createNewOpen: true, dataModels: [jsonMetadata1Mock] }, queryClient);

      await user.type(screen.getByRole('textbox'), dataTypeName);
      expect(
        screen.getByText(textMock('schema_editor.error_data_type_name_exists')),
      ).toBeInTheDocument();

      expect(okButton()).toBeDisabled();
    });
  });
});

const okButton = () => {
  return screen.getByRole('button', {
    name: textMock('schema_editor.create_model_confirm_button'),
  });
};

const render = (
  props: Partial<CreateNewWrapperProps> = {},
  queryClient = createQueryClientMock(),
) => {
  renderWithProviders(<CreateNewWrapper {...defaultProps} {...props} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/ui-editor`,
    queryClient,
  });
};
