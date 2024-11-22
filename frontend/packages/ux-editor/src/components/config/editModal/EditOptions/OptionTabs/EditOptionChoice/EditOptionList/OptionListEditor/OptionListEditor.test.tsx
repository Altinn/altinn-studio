import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';
import type { Option } from 'app-shared/types/Option';
import { OptionListEditor } from './OptionListEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../../../../../testing/mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '../../../../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';

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

  describe('OptionListEditorModalManualOptions', () => {
    it('should render the open Dialog button', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      const btnOpen = screen.getByRole('button', {
        name: textMock('ux_editor.modal_properties_code_list_button_title_manual'),
      });

      expect(btnOpen).toBeInTheDocument();
    });

    it('should open Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      await openManualModal(user);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      await openManualModal(user);
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call doReloadPreview when editing', async () => {
      const user = userEvent.setup();
      const handleComponentChange = jest.fn();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({ handleComponentChange });
      const text = 'test';

      await openManualModal(user);
      const textBox = screen.getByRole('textbox', {
        name: textMock('code_list_editor.description_item', { number: 2 }),
      });
      await user.type(textBox, text);
      await user.tab();

      await waitFor(() => expect(handleComponentChange).toHaveBeenCalledTimes(1));
    });
  });

  describe('OptionListEditorModal', () => {
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

    it('should render an error message when api throws an error', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        queries: {
          getOptionLists: jest.fn().mockRejectedValueOnce(new Error('Error')),
        },
      });

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_error_message')),
      ).toBeInTheDocument();
    });

    it('should render the open Dialog button', async () => {
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      const btnOpen = screen.getByRole('button', {
        name: textMock('ux_editor.modal_properties_code_list_button_title_library'),
      });

      expect(btnOpen).toBeInTheDocument();
    });

    it('should open Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      await openOptionModal(user);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close Dialog', async () => {
      const user = userEvent.setup();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved();

      await openOptionModal(user);
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call doReloadPreview when editing', async () => {
      const user = userEvent.setup();
      const doReloadPreview = jest.fn();
      await renderOptionListEditorAndWaitForSpinnerToBeRemoved({
        previewContextProps: { doReloadPreview },
      });

      await openOptionModal(user);
      const textBox = screen.getByRole('textbox', {
        name: textMock('code_list_editor.description_item', { number: 2 }),
      });
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

      await openOptionModal(user);
      const textBox = screen.getByRole('textbox', {
        name: textMock('code_list_editor.description_item', { number: 2 }),
      });
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
  });
});

const openOptionModal = async (user: UserEvent) => {
  const btnOpen = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_button_title_library'),
  });
  await user.click(btnOpen);
};
const openManualModal = async (user: UserEvent) => {
  const btnOpen = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_button_title_manual'),
  });
  await user.click(btnOpen);
};

const renderOptionListEditor = ({
  previewContextProps = {},
  queries = {},
  component = {},
  handleComponentChange = jest.fn(),
} = {}) => {
  return renderWithProviders(
    <OptionListEditor
      label={mockComponent.optionsId}
      optionsId={mockComponent.optionsId}
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
  await waitForElementToBeRemoved(() => {
    return screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title'));
  });
  return view;
};
