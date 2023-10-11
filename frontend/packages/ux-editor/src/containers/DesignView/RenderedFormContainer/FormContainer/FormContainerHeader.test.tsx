import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerHeaderProps } from './FormContainerHeader';
import { FormContainerHeader } from './FormContainerHeader';
import { renderWithMockStore } from '../../../../testing/mocks';
import { container1IdMock } from '../../../../testing/layoutMock';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const handleDeleteMock = jest.fn();

describe('FormContainerHeader', () => {
  it('should render the component', async () => {
    await render();

    expect(
      screen.getByText(textMock('ux_editor.component_group_header', { id: container1IdMock })),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeInTheDocument();
  });

  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(textMock('ux_editor.component_deletion_text'));
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: textMock('ux_editor.component_deletion_confirm'),
      });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', {
        name: textMock('ux_editor.component_deletion_confirm'),
      });
      await act(() => user.click(confirmButton));

      expect(handleDeleteMock).toBeCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      expect(handleDeleteMock).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      await render();

      const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(handleDeleteMock).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});

const render = async (props: Partial<IFormContainerHeaderProps> = {}) => {
  const allProps: IFormContainerHeaderProps = {
    id: container1IdMock,
    expanded: true,
    isEditMode: false,
    handleExpanded: jest.fn(),
    handleDelete: handleDeleteMock,
    dragHandleRef: null,
    ...props,
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormContainerHeader {...allProps} />
    </DndProvider>,
  );
};
