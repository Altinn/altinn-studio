import React from 'react';
import { screen } from '@testing-library/react';
import { AddItem, type AddItemProps, InlineItemAdder, type InlineItemAdderProps } from './AddItem';
import { renderWithProviders } from '../../../testing/mocks';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { IInternalLayout } from '../../../types/global';

describe('AddItem', () => {
  it('should render AddItem', () => {
    renderAddItem();
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.add_item.add_component') }),
    ).toBeInTheDocument();
  });

  it('clicking add component should show default components', async () => {
    const user = userEvent.setup();
    renderAddItem();
    const addButton = screen.getByRole('button', {
      name: textMock('ux_editor.add_item.add_component'),
    });
    await user.click(addButton);
    expect(
      await screen.findByText(textMock('ux_editor.add_item.select_component_header')),
    ).toBeInTheDocument();
  });
});

describe('InlineItemAdder', () => {
  it('should render InlineItemAdder with button', () => {
    renderInlineItemAdder();
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.add_item.add_component') }),
    ).toBeInTheDocument();
  });

  it('clicking add button should open component selection for inline adder', async () => {
    const user = userEvent.setup();
    renderInlineItemAdder();
    const addButton = screen.getByRole('button', {
      name: textMock('ux_editor.add_item.add_component'),
    });
    await user.click(addButton);
    expect(
      await screen.findByText(textMock('ux_editor.add_item.select_component_header')),
    ).toBeInTheDocument();
  });
});

const createDefaultLayout = (): IInternalLayout => ({
  order: {
    [BASE_CONTAINER_ID]: [],
  },
  containers: {
    [BASE_CONTAINER_ID]: {
      type: null,
      itemType: 'CONTAINER',
      id: BASE_CONTAINER_ID,
    } as const,
  },
  components: {},
  customDataProperties: {},
  customRootProperties: {},
});

const createDefaultAddItemProps = (): AddItemProps => ({
  containerId: BASE_CONTAINER_ID,
  layout: createDefaultLayout(),
});

const createDefaultInlineItemAdderProps = (): InlineItemAdderProps => ({
  containerId: BASE_CONTAINER_ID,
  layout: createDefaultLayout(),
  toggleIsOpen: jest.fn(),
  saveAtIndexPosition: 0,
});

const renderAddItem = (props: Partial<AddItemProps> = {}) => {
  return renderWithProviders(<AddItem {...createDefaultAddItemProps()} {...props} />);
};

const renderInlineItemAdder = (props: Partial<InlineItemAdderProps> = {}) => {
  return renderWithProviders(
    <InlineItemAdder {...createDefaultInlineItemAdderProps()} {...props} />,
  );
};
