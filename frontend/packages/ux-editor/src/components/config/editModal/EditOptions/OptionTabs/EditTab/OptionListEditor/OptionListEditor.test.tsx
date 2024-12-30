import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import type { OptionsList } from 'app-shared/types/api/OptionsLists';
import type { Option } from 'app-shared/types/Option';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { OptionListEditorProps } from './OptionListEditor';
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
const apiResult: OptionsList = [
  { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
  { value: 2, label: 'label number', description: null, helpText: null },
  { value: true, label: 'label boolean', description: null, helpText: null },
];
const getOptionListMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve<OptionsList>(apiResult));

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
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call doReloadPreview when editing', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();
      const text = 'test';
      const expectedArgs = mockComponent;
      expectedArgs.options[0].description = text;

      await user.click(getOptionModalButton());
      const textBox = getTextBoxInput(1);
      await user.type(textBox, text);
      await user.tab();

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
    });

    it('should display general.empty_string when option-list has an empty string', () => {
      mockComponent.options = [{ value: 2, label: '', description: 'test', helpText: null }];
      renderOptionListEditor({});

      expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
    });

    it('should call handleComponentChange when removing chosen options', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });

    it('should call handleComponentChange with correct parameters when removing chosen options', async () => {
      const user = userEvent.setup();
      renderOptionListEditor();
      const expectedResult = mockComponent;
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
          getOptionList: jest.fn().mockImplementation(() => Promise.resolve<OptionsList>([])),
        },
        props: { component: { ...mockComponent, options: undefined } },
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
        props: { component: { ...mockComponent, options: undefined } },
      });

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_fetch_option_list_error_message')),
      ).toBeInTheDocument();
    });

    it('should render the open Dialog button', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        props: { component: { ...mockComponent, options: undefined } },
      });
      expect(getOptionModalButton()).toBeInTheDocument();
    });

    it('should open Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        props: { component: { ...mockComponent, options: undefined } },
      });

      await user.click(getOptionModalButton());

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        props: { component: { ...mockComponent, options: undefined } },
      });

      await user.click(getOptionModalButton());
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when we upgrade to Designsystemet v1

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call doReloadPreview when editing', async () => {
      const user = userEvent.setup();
      const doReloadPreview = jest.fn();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        previewContextProps: { doReloadPreview },
        props: { component: { ...mockComponent, options: undefined } },
      });

      await user.click(getOptionModalButton());
      const textBox = getTextBoxInput(2);
      await user.type(textBox, 'test');
      await user.tab();

      await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
    });

    it('should call updateOptionList with correct parameters when closing Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        props: { component: { ...mockComponent, options: undefined } },
      });
      const expectedResultAfterEdit: Option[] = [
        { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
        { value: 2, label: 'label number', description: 'test', helpText: null },
        { value: true, label: 'label boolean', description: null, helpText: null },
      ];

      await user.click(getOptionModalButton());
      const textBox = getTextBoxInput(2);
      await user.type(textBox, 'test');
      await user.tab();

      await waitFor(() => expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1));
      expect(queriesMock.updateOptionList).toHaveBeenCalledWith(
        org,
        app,
        mockComponent.optionsId,
        expectedResultAfterEdit,
      );
    });

    it('should display general.empty_string when option-list has an empty string', async () => {
      const apiResultWithEmptyLabel: OptionsList = [
        { value: true, label: '', description: null, helpText: null },
      ];
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        queries: {
          getOptionList: jest
            .fn()
            .mockImplementation(() => Promise.resolve<OptionsList>(apiResultWithEmptyLabel)),
        },
      });

      expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
    });

    it('should call handleComponentChange when removing chosen options', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });

    it('should call handleComponentChange with correct parameters when removing chosen options', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();
      const expectedResult = mockComponent;
      expectedResult.options = undefined;
      expectedResult.optionsId = undefined;

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith(expectedResult);
    });
  });
});

function getOptionModalButton() {
  return screen.getByRole('button', {
    name: textMock('general.edit'),
  });
}

function getTextBoxInput(number: number) {
  return screen.getByRole('textbox', {
    name: textMock('code_list_editor.description_item', { number }),
  });
}

const defaultProps: OptionListEditorProps = {
  component: mockComponent,
  handleComponentChange,
};

const renderOptionListEditor = ({ previewContextProps = {}, queries = {}, props = {} } = {}) => {
  return renderWithProviders(<OptionListEditor {...defaultProps} {...props} />, {
    queries: { getOptionList: getOptionListMock, ...queries },
    queryClient: createQueryClientMock(),
    previewContextProps,
  });
};

const renderOptionListEditorAndWaitForSpinnerToBeRemoved = async ({
  previewContextProps = {},
  queries = {},
  props = {},
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
