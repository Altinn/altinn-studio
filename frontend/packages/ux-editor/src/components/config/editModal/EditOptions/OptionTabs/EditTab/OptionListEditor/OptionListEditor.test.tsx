import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';
import type { Option } from 'app-shared/types/Option';
import { ComponentType } from 'app-shared/types/ComponentType';
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

const apiResult: OptionsLists = {
  options: [
    { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
    { value: 2, label: 'label number', description: null, helpText: null },
    { value: true, label: 'label boolean', description: null, helpText: null },
  ],
};

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
      mockComponent.options = [
        { value: 'test', label: 'label text', description: 'description', helpText: 'help text' },
      ];
      const handleComponentChange = jest.fn();
      renderOptionListEditor({
        handleComponentChange,
      });

      const text = 'test';
      await user.click(getOptionModalButton());
      const textBox = getTextBoxInput(1);
      await user.type(textBox, text);
      await user.tab();

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });

    it('should display general.empty_string when option-list has an empty string', () => {
      mockComponent.options = [{ value: 2, label: '', description: 'test', helpText: null }];
      renderOptionListEditor({});

      expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
    });

    it('should call handleComponentChange when removing chosen options', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      renderOptionListEditor({ handleComponentChange });

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });

    it('should call handleComponentChange with correct parameters when removing chosen options', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      renderOptionListEditor({ handleComponentChange });
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
    beforeEach(() => {
      mockComponent.optionsId = 'options';
      mockComponent.options = undefined;
    });

    it('should render a spinner when there is no data', () => {
      renderOptionListEditor({
        queries: {
          getOptionLists: jest.fn().mockImplementation(() => Promise.resolve<OptionsLists>({})),
        },
      });

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
      ).toBeInTheDocument();
    });

    it('should render an error message when getOptionLists throws an error', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        queries: {
          getOptionLists: jest.fn().mockImplementation(() => Promise.reject()),
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
      const textBox = getTextBoxInput(2);
      await user.type(textBox, 'test');
      await user.tab();

      await waitFor(() => expect(doReloadPreview).toHaveBeenCalledTimes(1));
    });

    it('should call updateOptionList with correct parameters when closing Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();
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
      const apiResultWithEmptyLabel: OptionsLists = {
        options: [{ value: true, label: '', description: null, helpText: null }],
      };
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        queries: {
          getOptionLists: jest
            .fn()
            .mockImplementation(() => Promise.resolve<OptionsLists>(apiResultWithEmptyLabel)),
        },
      });

      expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
    });

    it('should call handleComponentChange when removing chosen options', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({ handleComponentChange });

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await user.click(deleteButton);

      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });

    it('should call handleComponentChange with correct parameters when removing chosen options', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({ handleComponentChange });
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

const renderOptionListEditor = ({
  previewContextProps = {},
  queries = {},
  component = {},
  handleComponentChange = jest.fn(),
} = {}) => {
  return renderWithProviders(
    <OptionListEditor
      component={{ ...mockComponent, ...component }}
      handleComponentChange={handleComponentChange}
    />,
    {
      queries: {
        getOptionLists: jest
          .fn()
          .mockImplementation(() => Promise.resolve<OptionsLists>(apiResult)),
        ...queries,
      },
      queryClient: createQueryClientMock(),
      previewContextProps,
    },
  );
};

const renderOptionListEditorAndWaitForSpinnerToBeRemoved = async ({
  previewContextProps = {},
  queries = {
    getOptionLists: jest.fn().mockImplementation(() => Promise.resolve<OptionsLists>(apiResult)),
  },
  component = {},
  handleComponentChange = jest.fn(),
} = {}) => {
  const view = renderOptionListEditor({
    previewContextProps,
    queries,
    component,
    handleComponentChange,
  });
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
  );
  return view;
};
