import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WithHoverAddButton, type WithHoverAddButtonProps } from './WithHoverAddButton';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const defaultProps: Omit<WithHoverAddButtonProps, 'children'> = {
  title: 'Test Add Button',
  containerId: BASE_CONTAINER_ID,
  saveAtIndexPosition: 0,
  layout: {
    order: {
      [BASE_CONTAINER_ID]: [],
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

describe('WithHoverAddButton', () => {
  it('shows action bar on hover', async () => {
    const user = userEvent.setup();
    renderWithHoverAddButton();
    await user.hover(getClickableActionBar());
    expect(getClickableActionBar()).toBeVisible();
  });

  it('toggles InlineItemAdder on click', async () => {
    const user = userEvent.setup();
    renderWithHoverAddButton();
    await user.click(getClickableActionBar());

    expect(getAddItemInlineHeading()).toBeInTheDocument();
  });

  it('hides InlineItemAdder when toggleIsOpen is triggered', async () => {
    const user = userEvent.setup();
    renderWithHoverAddButton();
    await user.click(getClickableActionBar());
    expect(getAddItemInlineHeading()).toBeInTheDocument();

    await user.click(getClickableActionBar());
    expect(queryAddItemInlineHeading()).not.toBeInTheDocument();
  });

  it('should handle onClose callback', async () => {
    const user = userEvent.setup();
    renderWithHoverAddButton();
    await user.click(getClickableActionBar());
    expect(getAddItemInlineHeading()).toBeInTheDocument();

    await user.click(getCloseButton());
    expect(queryAddItemInlineHeading()).not.toBeInTheDocument();
  });
});

function renderWithHoverAddButton() {
  renderWithProviders(
    <WithHoverAddButton {...defaultProps}>
      <div>Test Child</div>
    </WithHoverAddButton>,
  );
}

function getClickableActionBar(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Test Add Button' });
}

function getAddItemInlineHeading(): HTMLHeadingElement {
  return screen.getByText(textMock('ux_editor.add_item.select_component_header'));
}

function queryAddItemInlineHeading(): HTMLHeadingElement | null {
  return screen.queryByText(textMock('ux_editor.add_item.select_component_header'));
}

function getCloseButton(): HTMLButtonElement {
  return screen.getByTitle(textMock('general.close'));
}
