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
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const [testOrg, testApp] = ['testOrg', 'testApp'];
const mockCreateDataModel = jest.fn();
const mockSetIsCreateNewOpen = jest.fn();
const defaultProps: CreateNewWrapperProps = {
  isCreateNewOpen: false,
  dataModels: [],
  disabled: false,
  setIsCreateNewOpen: mockSetIsCreateNewOpen,
};

describe('CreateNewWrapper', () => {
  afterEach(jest.clearAllMocks);

  it('should open the popup when clicking "new" button', async () => {
    const user = userEvent.setup();
    render();

    expect(queryInputField()).not.toBeInTheDocument();
    expect(queryConfirmButton()).not.toBeInTheDocument();

    await user.click(getNewButton());

    expect(mockSetIsCreateNewOpen).toHaveBeenCalledTimes(1);
    expect(mockSetIsCreateNewOpen).toHaveBeenCalledWith(true);
  });

  it('should close the popup when clicking "new" button', async () => {
    const user = userEvent.setup();
    render({ isCreateNewOpen: true });

    expect(queryInputField()).toBeInTheDocument();
    expect(queryConfirmButton()).toBeInTheDocument();

    await user.click(getNewButton());

    expect(mockSetIsCreateNewOpen).toHaveBeenCalledTimes(1);
    expect(mockSetIsCreateNewOpen).toHaveBeenCalledWith(false);
  });

  it('should show an error text when validation fails', async () => {
    const user = userEvent.setup();
    const newModelName = dataModel1NameMock;
    const errorMessage = textMock('schema_editor.error_model_name_exists', { newModelName });
    render({ isCreateNewOpen: true, dataModels: [jsonMetadata1Mock] });

    expect(queryErrorMessage(errorMessage)).not.toBeInTheDocument();

    await user.type(queryInputField(), newModelName);

    expect(queryErrorMessage(errorMessage)).toBeInTheDocument();
    expect(queryConfirmButton()).toBeDisabled();
  });

  describe('createDataModel', () => {
    it('should call createDataModel when confirm button is clicked', async () => {
      const user = userEvent.setup();
      render({ isCreateNewOpen: true });

      await user.type(queryInputField(), 'new-model');
      await user.click(queryConfirmButton());

      expect(mockCreateDataModel).toHaveBeenCalledWith(testOrg, testApp, {
        modelName: 'new-model',
        relativeDirectory: undefined,
      });
    });

    it('should call createDataModel when input is focused and Enter key is pressed', async () => {
      const user = userEvent.setup();
      render({ isCreateNewOpen: true });

      await user.type(queryInputField(), 'new-model');
      await user.keyboard('{Enter}');

      expect(mockCreateDataModel).toHaveBeenCalledWith(testOrg, testApp, {
        modelName: 'new-model',
        relativeDirectory: undefined,
      });
    });

    it('should call createDataModel with relativePath when createPathOption is set and ok button is clicked', async () => {
      const user = userEvent.setup();
      render({ isCreateNewOpen: true, createPathOption: true });

      await user.type(queryInputField(), 'new-model');
      await user.click(queryConfirmButton());

      expect(mockCreateDataModel).toHaveBeenCalledWith(testOrg, testApp, {
        modelName: 'new-model',
        relativeDirectory: '',
      });
    });

    it('should not call createDataModel when name field is empty and ok button is clicked', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      render({ isCreateNewOpen: true, dataModels: [jsonMetadata1Mock] });

      await userWithNoPointerEventCheck.click(queryConfirmButton());

      expect(mockCreateDataModel).not.toHaveBeenCalled();
    });

    it('should not call createDataModel when name field is empty and enter button is pressed', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      render({ isCreateNewOpen: true, dataModels: [jsonMetadata1Mock] });

      await userWithNoPointerEventCheck.keyboard('{Enter}');

      expect(mockCreateDataModel).not.toHaveBeenCalled();
    });
  });
});

const getNewButton = () => screen.getByRole('button', { name: textMock('general.create_new') });

const queryInputField = () =>
  screen.queryByRole('textbox', { name: textMock('schema_editor.create_model_description') });

const queryErrorMessage = (errorMessage: string) => {
  return screen.queryByText(errorMessage);
};

const queryConfirmButton = () =>
  screen.queryByRole('button', { name: textMock('schema_editor.create_model_confirm_button') });

const render = (
  props: Partial<CreateNewWrapperProps> = {},
  queryClient = createQueryClientMock(),
) => {
  renderWithProviders(<CreateNewWrapper {...defaultProps} {...props} />, {
    queries: { createDataModel: mockCreateDataModel },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/ui-editor`,
    queryClient,
  });
};
