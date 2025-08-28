import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { CreateNewWrapperProps } from './CreateNewWrapper';
import { CreateNewWrapper } from './CreateNewWrapper';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../../test/testUtils';
import { app, org } from '@studio/testing/testids';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const mockCreateDataModel = jest.fn();
const mockSetIsCreateNewOpen = jest.fn();
const defaultProps: CreateNewWrapperProps = {
  isCreateNewOpen: false,
  disabled: false,
  setIsCreateNewOpen: mockSetIsCreateNewOpen,
  dataModels: [],
};

describe('CreateNewWrapper', () => {
  afterEach(jest.clearAllMocks);

  it('should open the popup when clicking "new" button', async () => {
    const user = userEvent.setup();
    renderCreateNewWrapper();

    expect(queryInputField()).not.toBeInTheDocument();
    expect(queryConfirmButton()).not.toBeInTheDocument();

    await user.click(getNewButton());

    expect(mockSetIsCreateNewOpen).toHaveBeenCalledTimes(1);
    expect(mockSetIsCreateNewOpen).toHaveBeenCalledWith(true);
  });

  it('should close the popup when clicking "new" button', async () => {
    const user = userEvent.setup();
    renderCreateNewWrapper({ isCreateNewOpen: true });

    expect(queryInputField()).toBeInTheDocument();
    expect(queryConfirmButton()).toBeInTheDocument();

    await user.click(getNewButton());

    expect(mockSetIsCreateNewOpen).toHaveBeenCalledTimes(1);
    expect(mockSetIsCreateNewOpen).toHaveBeenCalledWith(false);
  });

  it('should disable confirm button and show an error text when validation fails', async () => {
    const user = userEvent.setup();
    const newModelName = '_InvalidName';
    const errorMessage = textMock('schema_editor.error_invalid_datamodel_name');
    renderCreateNewWrapper({ isCreateNewOpen: true });

    expect(queryErrorMessage(errorMessage)).not.toBeInTheDocument();

    await user.type(queryInputField(), newModelName);

    expect(queryErrorMessage(errorMessage)).toBeInTheDocument();
    expect(queryConfirmButton()).toBeDisabled();
  });

  describe('createDataModel', () => {
    it('should call createDataModel when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderCreateNewWrapper({ isCreateNewOpen: true });

      await user.type(queryInputField(), 'newModel');
      await user.click(queryConfirmButton());

      expect(mockCreateDataModel).toHaveBeenCalledWith(org, app, {
        modelName: 'newModel',
        relativeDirectory: undefined,
      });
    });

    it('should call createDataModel when input is focused and Enter key is pressed', async () => {
      const user = userEvent.setup();
      renderCreateNewWrapper({ isCreateNewOpen: true });

      await user.type(queryInputField(), 'newModel');
      await user.keyboard('{Enter}');

      expect(mockCreateDataModel).toHaveBeenCalledWith(org, app, {
        modelName: 'newModel',
        relativeDirectory: undefined,
      });
    });

    it('should call createDataModel with relativePath when createPathOption is set and ok button is clicked', async () => {
      const user = userEvent.setup();
      renderCreateNewWrapper({ isCreateNewOpen: true, createPathOption: true });

      await user.type(queryInputField(), 'newModel');
      await user.click(queryConfirmButton());

      expect(mockCreateDataModel).toHaveBeenCalledWith(org, app, {
        modelName: 'newModel',
        relativeDirectory: '',
      });
    });

    it('should not call createDataModel when name field is empty and ok button is clicked', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      renderCreateNewWrapper({ isCreateNewOpen: true });

      await userWithNoPointerEventCheck.click(queryConfirmButton());

      expect(mockCreateDataModel).not.toHaveBeenCalled();
    });

    it('should not call createDataModel when name field is empty and enter button is pressed', async () => {
      const userWithNoPointerEventCheck = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });
      renderCreateNewWrapper({ isCreateNewOpen: true });

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

const renderCreateNewWrapper = (
  props: Partial<CreateNewWrapperProps> = {},
  queryClient = createQueryClientMock(),
) => {
  renderWithProviders(<CreateNewWrapper {...defaultProps} {...props} />, {
    queries: { createDataModel: mockCreateDataModel },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/ui-editor`,
    queryClient,
  });
};
