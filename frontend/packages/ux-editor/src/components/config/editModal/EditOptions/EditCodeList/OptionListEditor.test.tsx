import React from 'react';
import { screen } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { Option } from 'app-shared/types/Option';
import type { FormComponent } from '../../../../../types/FormComponent';
import { OptionListEditor } from './OptionListEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
mockComponent.optionsId = 'text';

const optionsList = new Map<string, Option[]>([
  [
    'text',
    [{ value: 'test', label: 'label text', description: 'description', helpText: 'help text' }],
  ],
  ['number', [{ value: 2, label: 'label number' }]],
  ['boolean', [{ value: true, label: 'label boolean' }]],
]);

const queryClientMock = createQueryClientMock();

describe('OptionListEditor', () => {
  afterEach(() => {
    queryClientMock.clear();
  });

  it('should render a spinner when there is no data', async () => {
    await renderCodeListTableEditor({
      queries: {
        getOptionLists: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve<Map<string, Option[]>>(new Map<string, Option[]>()),
          ),
      },
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    ).toBeInTheDocument();
  });

  it('should render the component', async () => {
    await renderCodeListTableEditor();
    const btnOpen = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_open_editor'),
    });

    expect(btnOpen).toBeInTheDocument();
  });

  it('should open Dialog', async () => {
    const user = userEvent.setup();
    await renderCodeListTableEditor();
    await openModal(user);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close Dialog', async () => {
    const user = userEvent.setup();
    await renderCodeListTableEditor();
    await openModal(user);

    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call handleClose when closing Dialog', async () => {
    const user = userEvent.setup();
    const doReloadPreview = jest.fn();
    await renderCodeListTableEditor({
      previewContextProps: { doReloadPreview },
    });
    await openModal(user);

    await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doReloadPreview).toHaveBeenCalledTimes(1);
  });
});

const openModal = async (user: UserEvent) => {
  const btnOpen = screen.getByRole('button', {
    name: textMock('ux_editor.modal_properties_code_list_open_editor'),
  });
  await user.click(btnOpen);
};

const renderCodeListTableEditor = async ({
  previewContextProps = {},
  queries = {
    getOptionLists: jest
      .fn()
      .mockImplementation(() => Promise.resolve<Map<string, Option[]>>(optionsList)),
  },
} = {}) => {
  return renderWithProviders(
    <OptionListEditor
      component={{
        ...mockComponent,
      }}
    />,
    {
      queries: queries,
      queryClient: queryClientMock,
      previewContextProps: previewContextProps,
    },
  );
};
