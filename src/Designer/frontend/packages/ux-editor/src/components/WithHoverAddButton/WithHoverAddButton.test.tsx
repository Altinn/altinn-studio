import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WithHoverAddButton, type WithHoverAddButtonProps } from './WithHoverAddButton';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { IInternalLayout } from '../../types/global';

//Test data
const repeatingGroupId = 'repeating-group-1';

function createLayoutWithContainer(containerId: string, containerType: string): IInternalLayout {
  return {
    order: {},
    containers: {
      [BASE_CONTAINER_ID]: {
        type: null,
        itemType: 'CONTAINER' as const,
        id: BASE_CONTAINER_ID,
      },
      [containerId]: {
        type: containerType,
        itemType: 'CONTAINER' as const,
        id: containerId,
      } as any,
    },
    components: {},
    customDataProperties: {},
    customRootProperties: {},
  } as IInternalLayout;
}

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

  it('should apply lastChild class when isLastChild is true and parent is RepeatingGroup', () => {
    const layout = createLayoutWithContainer(repeatingGroupId, 'RepeatingGroup');
    renderWithHoverAddButton({
      layout,
      containerId: repeatingGroupId,
      isLastChild: true,
    });
    const rootElement = screen.getByTestId('with-hover-add-button-root');
    expect(rootElement).toHaveClass('lastChild');
  });

  it('should not apply lastChild class when isLastChild is true but parent is not RepeatingGroup', () => {
    const groupId = 'group-1';
    const layout = createLayoutWithContainer(groupId, 'Group');
    renderWithHoverAddButton({
      layout,
      containerId: groupId,
      isLastChild: true,
    });
    const rootElement = screen.getByTestId('with-hover-add-button-root');
    expect(rootElement).not.toHaveClass('lastChild');
  });

  it('should not apply lastChild class when isLastChild is false', () => {
    const layout = createLayoutWithContainer(repeatingGroupId, 'RepeatingGroup');
    renderWithHoverAddButton({
      layout,
      containerId: repeatingGroupId,
      isLastChild: false,
    });
    const rootElement = screen.getByTestId('with-hover-add-button-root');
    expect(rootElement).not.toHaveClass('lastChild');
  });

  it('should not apply lastChild class when isLastChild is undefined', () => {
    const layout = createLayoutWithContainer(repeatingGroupId, 'RepeatingGroup');
    renderWithHoverAddButton({
      layout,
      containerId: repeatingGroupId,
    });
    const rootElement = screen.getByTestId('with-hover-add-button-root');
    expect(rootElement).not.toHaveClass('lastChild');
  });

  it('should handle null parentContainer when containerId is falsy', () => {
    const layout = createLayoutWithContainer(repeatingGroupId, 'RepeatingGroup');
    renderWithHoverAddButton({
      layout,
      containerId: '',
      isLastChild: true,
    });
    const rootElement = screen.getByTestId('with-hover-add-button-root');
    expect(rootElement).not.toHaveClass('lastChild');
  });
});

function renderWithHoverAddButton(
  props?: Partial<WithHoverAddButtonProps>,
  children: React.ReactNode = <div>Test Child</div>,
) {
  return renderWithProviders(
    <WithHoverAddButton {...defaultProps} {...props}>
      {children}
    </WithHoverAddButton>,
  );
}

function getClickableActionBar(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Test Add Button' });
}

function getAddItemInlineHeading(): HTMLHeadingElement {
  return screen.getByRole('heading', {
    level: 4,
    name: textMock('ux_editor.add_item.select_component_header'),
  });
}

function queryAddItemInlineHeading(): HTMLHeadingElement | null {
  return screen.queryByRole('heading', {
    level: 4,
    name: textMock('ux_editor.add_item.select_component_header'),
  });
}

function getCloseButton(): HTMLButtonElement {
  return screen.getByTitle(textMock('general.close'));
}
