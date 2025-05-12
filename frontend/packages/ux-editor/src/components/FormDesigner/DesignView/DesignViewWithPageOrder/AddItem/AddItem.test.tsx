import React from 'react';
import { screen } from '@testing-library/react';
import { AddItem, type AddItemProps } from './AddItem';
import { renderWithProviders } from '../../../../../testing/mocks';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('AddItem', () => {
  it('should render AddItem', () => {
    renderAddItem({});
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.add_item.add_component') }),
    ).toBeInTheDocument();
  });

  it('clicking add component should show default components', async () => {
    const user = userEvent.setup();
    renderAddItem({});
    const addButton = screen.getByRole('button', {
      name: textMock('ux_editor.add_item.add_component'),
    });
    await user.click(addButton);
    expect(
      await screen.findByText(textMock('ux_editor.add_item.select_component_header')),
    ).toBeInTheDocument();
  });
});

const renderAddItem = (props: Partial<AddItemProps>) => {
  const defaultProps: AddItemProps = {
    containerId: BASE_CONTAINER_ID,
    layout: {
      order: {
        BASE_CONTAINER_ID: [],
      },
      containers: {
        [BASE_CONTAINER_ID]: {
          type: null,
          itemType: 'CONTAINER',
          id: BASE_CONTAINER_ID,
        },
      },
      components: {},
      customDataProperties: {},
      customRootProperties: {},
    },
  };
  return renderWithProviders(<AddItem {...defaultProps} {...props} />);
};
