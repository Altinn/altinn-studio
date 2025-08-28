import { render, screen } from '@testing-library/react';
import React from 'react';
import type { HTMLTabElement } from './dom-utils';
import { moveFocus } from './dom-utils';

describe('moveFocus', () => {
  it('moves focus to the next tab when ArrowDown is pressed', () => {
    renderTabList();
    simulateFocusMove('ArrowDown', 'tab-1', 'tab-2');
    simulateFocusMove('ArrowDown', 'tab-2', 'tab-3');
  });

  it('moves focus to the previous tab when ArrowUp is pressed', () => {
    renderTabList();
    simulateFocusMove('ArrowUp', 'tab-3', 'tab-2');
    simulateFocusMove('ArrowUp', 'tab-2', 'tab-1');
  });
});

const renderTabList = (): void => {
  render(
    <div role='tablist'>
      <button role='tab' data-testid='tab-1'>
        Tab 1
      </button>
      <button role='tab' data-testid='tab-2'>
        Tab 2
      </button>
      <button role='tab' data-testid='tab-3'>
        Tab 3
      </button>
    </div>,
  );
};

function simulateFocusMove(key: string, initialTabId: string, expectedFocusedTabId: string): void {
  const initialTab = screen.getByTestId(initialTabId);
  initialTab.focus();
  const event = {
    key,
    currentTarget: initialTab,
    preventDefault: jest.fn(),
  } as unknown as React.KeyboardEvent<HTMLTabElement>;
  moveFocus(event);
  expect(screen.getByTestId(expectedFocusedTabId)).toHaveFocus();
}
