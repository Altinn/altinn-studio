import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import type { OptionList } from 'app-shared/types/OptionList';
import type { Option } from 'app-shared/types/Option';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { OptionListEditorProps } from './OptionListEditor';
import { ObjectUtils } from '@studio/pure-functions';
import { OptionListEditor } from './OptionListEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '../../../../../../../testing/componentMocks';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const handleComponentChange = jest.fn();
const apiResult: OptionList = [
  { value: 'value 1', label: 'label 1', description: 'description', helpText: 'help text' },
  { value: 'value 2', label: 'label 2', description: null, helpText: null },
  { value: 'value 3', label: 'label 3', description: null, helpText: null },
];
const getOptionListMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve<OptionList>(apiResult));
const componentWithOptionsId = { ...mockComponent, options: undefined, optionsId: 'some-id' };

describe('OptionListEditor', () => {
  afterEach(() => jest.clearAllMocks());

  describe('ManualOptionEditor', () => {
    it('should render the open Dialog button', () => {
      renderOptionListEditor();
      expect(getOptionModalButton()).toBeInTheDocument();
    });

    it('should open Dialog', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();

      await user.click(getOptionModalButton());

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText(textMock('ux_editor.options.modal_header_manual_code_list')),
      ).toBeInTheDocument();
    });

    it('should close Dialog', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();
      await user.click(getOptionModalButton());

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call handleComponentChange with correct parameters when closing Dialog and options is empty', async () => {
      const user = userEvent.setup();
      renderOptionListEditor({
        props: { component: { ...mockComponent, options: [], optionsId: undefined } },
      });
      const expectedArgs = ObjectUtils.deepCopy(mockComponent);
      expectedArgs.options = undefined;
      expectedArgs.optionsId = undefined;

      await user.click(getOptionModalButton());
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
    });

    it('should call handleComponentChange with correct parameters when editing', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();
      const text = 'test';
      const expectedArgs = ObjectUtils.deepCopy(mockComponent);
      expectedArgs.optionsId = undefined;
      expectedArgs.options[0].description = text;

      await user.click(getOptionModalButton());
      const textBox = getDescriptionInput(1);
      await user.type(textBox, text);
      await user.tab();

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
    });

    it('should show placeholder for option label when option list label is empty', () => {
      renderOptionListEditor({
        props: {
          component: {
            ...mockComponent,
            options: [{ value: 2, label: '', description: 'test', helpText: null }],
          },
        },
      });

      expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
    });

    it('should call handleComponentChange with correct parameters when removing chosen options', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();
      const expectedResult = ObjectUtils.deepCopy(mockComponent);
      expectedResult.options = undefined;
      expectedResult.optionsId = undefined;

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('LibraryOptionEditor', () => {
    it('should render a spinner when there is no data', () => {
      renderOptionListEditor({
        queries: {
          getOptionList: jest.fn().mockImplementation(() => Promise.resolve<OptionList>([])),
        },
        props: { component: componentWithOptionsId },
      });

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
      ).toBeInTheDocument();
    });

    it('should render an error message when getOptionLists throws an error', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        queries: {
          getOptionList: jest.fn().mockImplementation(() => Promise.reject()),
        },
      });

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_fetch_option_list_error_message')),
      ).toBeInTheDocument();
    });

    it('should render the open Dialog button', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();
      expect(getOptionModalButton()).toBeInTheDocument();
    });

    it('should open Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      await user.click(getOptionModalButton());

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();
      await user.click(getOptionModalButton());

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call doReloadPreview when editing', async () => {
      const user = userEvent.setup();
      const doReloadPreview = jest.fn();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        previewContextProps: { doReloadPreview },
      });

      await user.click(getOptionModalButton());
      const textBox = getDescriptionInput(2);
      await user.type(textBox, 'test');
      await user.tab();

      await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
    });

    it('should call updateOptionList with correct parameters when closing Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();
      const expectedResultAfterEdit: Option[] = [
        { value: 'value 1', label: 'label 1', description: 'description', helpText: 'help text' },
        { value: 'value 2', label: 'label 2', description: 'test', helpText: null },
        { value: 'value 3', label: 'label 3', description: null, helpText: null },
      ];

      await user.click(getOptionModalButton());
      const textBox = getDescriptionInput(2);
      await user.type(textBox, 'test');
      await user.tab();

      await waitFor(() => expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1));
      expect(queriesMock.updateOptionList).toHaveBeenCalledWith(
        org,
        app,
        componentWithOptionsId.optionsId,
        expectedResultAfterEdit,
      );
    });

    it('should show placeholder for option label when option list label is empty', async () => {
      const apiResultWithEmptyLabel: OptionList = [
        { value: true, label: '', description: null, helpText: null },
      ];
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        queries: {
          getOptionList: jest
            .fn()
            .mockImplementation(() => Promise.resolve<OptionList>(apiResultWithEmptyLabel)),
        },
      });

      expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
    });

    it('should call handleComponentChange with correct parameters when removing chosen options', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith({
        ...mockComponent,
        options: undefined,
        optionsId: undefined,
      });
    });
  });
});

function getOptionModalButton() {
  return screen.getByRole('button', {
    name: textMock('general.edit'),
  });
}

function getDescriptionInput(number: number) {
  return screen.getByRole('textbox', {
    name: textMock('code_list_editor.description_item', { number }),
  });
}

const renderOptionListEditor = ({ previewContextProps = {}, queries = {}, props = {} } = {}) => {
  const defaultProps: OptionListEditorProps = {
    component: mockComponent,
    handleComponentChange,
  };

  return renderWithProviders(<OptionListEditor {...defaultProps} {...props} />, {
    queries: { getOptionList: getOptionListMock, ...queries },
    queryClient: createQueryClientMock(),
    previewContextProps,
  });
};

const renderOptionListEditorAndWaitForSpinnerToBeRemoved = async ({
  previewContextProps = {},
  queries = {},
  props = { component: componentWithOptionsId },
} = {}) => {
  const view = renderOptionListEditor({
    previewContextProps,
    queries,
    props,
  });
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
  );
  return view;
};
