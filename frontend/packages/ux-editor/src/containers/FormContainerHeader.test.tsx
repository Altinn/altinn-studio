import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerHeaderProps } from './FormContainerHeader';
import { FormContainerHeader } from './FormContainerHeader';
import { renderWithMockStore } from '../testing/mocks';
import { container1IdMock } from '../testing/layoutMock';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const handleDeleteMock = jest.fn();
const handleEditMock = jest.fn();

describe('FormContainerHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    expect(screen.getByText('Gruppe - $' + container1IdMock)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeInTheDocument();
  });

  test('Popover should be displayed when the user clicks the delete button', async () => {
    await render();
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
  });

  it('should delete when clicking the confirm delete group button inside popover', async () => {
    await render();
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
    const confirmDeletButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_confirm_delete_component'),
    });
    await act(() => user.click(confirmDeletButton));
    expect(handleDeleteMock).toHaveBeenCalledTimes(1);
  });

  test('Popover should be closed when the user clicks the cancel button', async () => {
    await render();
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    const cancelPopoverButton = screen.getByRole('button', {
      name: textMock('schema_editor.textRow-cancel-popover'),
    });
    await act(() => user.click(cancelPopoverButton));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('Should not delete the component when the user just cancels popover', async () => {
    await render();
    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(deleteButton));
    const cancelPopoverButton = screen.getByRole('button', {
      name: textMock('schema_editor.textRow-cancel-popover'),
    });
    await act(() => user.click(cancelPopoverButton));
    await waitFor(() => expect(handleDeleteMock).toHaveBeenCalledTimes(0));
  });
});

const render = async (props: Partial<IFormContainerHeaderProps> = {}) => {
  const allProps: IFormContainerHeaderProps = {
    id: container1IdMock,
    expanded: true,
    isEditMode: false,
    handleExpanded: jest.fn(),
    handleDelete: handleDeleteMock,
    handleEdit: handleEditMock,
    dragHandleRef: null,
    ...props
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormContainerHeader {...allProps} />
    </DndProvider>
  );
};
