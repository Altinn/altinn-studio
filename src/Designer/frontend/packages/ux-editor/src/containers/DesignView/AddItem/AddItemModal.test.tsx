import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddItemModal, type AddItemModalProps } from './AddItemModal';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('AddItemModal', () => {
  it('should render add item modal', () => {
    renderAddItemModal({});
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.add_item.show_all') }),
    ).toBeInTheDocument();
  });

  it('should open modal dialog when show all button is clicked', async () => {
    const user = userEvent.setup();
    renderAddItemModal({});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: textMock('ux_editor.add_item.show_all') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should close modal dialog when cancel button is clicked', async () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    renderAddItemModal({});
    await user.click(screen.getByRole('button', { name: textMock('ux_editor.add_item.show_all') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lukk dialogvindu' }));
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    dialog.close();
    dialog.dispatchEvent(new Event('close', { bubbles: true }));
    consoleErrorMock.mockRestore();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const renderAddItemModal = (props: Partial<AddItemModalProps>) => {
  const defaultProps: AddItemModalProps = {
    containerId: BASE_CONTAINER_ID,
    layout: {
      order: {
        [BASE_CONTAINER_ID]: [],
      },
      containers: {
        [BASE_CONTAINER_ID]: {
          id: BASE_CONTAINER_ID,
          itemType: 'CONTAINER',
          type: null,
        },
      },
      components: {},
      customDataProperties: {},
      customRootProperties: {},
    },
    onAddComponent: jest.fn(),
    availableComponents: {
      formComponents: [],
    },
  };
  return renderWithProviders(<AddItemModal {...defaultProps} {...props} />);
};
