import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../../types/FormComponent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { CodeListEditor } from './CodeListEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import type { Option } from 'app-shared/types/Option';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
mockComponent.optionsId = 'test';

const optionsList = new Map([
  [
    'text',
    [{ value: 'test', label: 'label text', description: 'description', helpText: 'help text' }],
  ],
  ['number', [{ value: 2, label: 'label number' }]],
  ['boolean', [{ value: true, label: 'label boolean' }]],
]);
const queriesMock = {
  getOptionLists: jest
    .fn()
    .mockImplementation(() => Promise.resolve<Map<string, Option[]>>(optionsList)),
};
const queryClientMock = createQueryClientMock();

describe('CodeListTableEditor', () => {
  afterEach(() => {
    queryClientMock.clear();
  });

  it('should render the component', async () => {
    await renderCodeListTableEditor();

    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.modal_properties_code_list_open_editor'),
      }),
    ).toBeInTheDocument();
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

  it('should call handClose when closing Dialog', async () => {
    const user = userEvent.setup();
    const doReloadPreview = jest.fn();
    await renderCodeListTableEditor({ previewContextProps: { doReloadPreview } });
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

const renderCodeListTableEditor = async ({ previewContextProps = {} } = {}) => {
  const view = renderWithProviders(
    <CodeListEditor
      component={{
        ...mockComponent,
      }}
    />,
    {
      queries: queriesMock,
      queryClient: queryClientMock,
      previewContextProps: previewContextProps,
    },
  );
  await waitForElementToBeRemoved(screen.queryByTestId('studio-spinner-test-id'));
  return view;
};
