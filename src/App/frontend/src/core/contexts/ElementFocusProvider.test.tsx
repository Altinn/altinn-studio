import React, { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { ElementFocusProvider, useFocusOnRequest, useRequestFocus } from 'src/core/contexts/ElementFocusProvider';

/**
 * Renders a heading wired up with the focus hooks, plus buttons to request focus and to remount the
 * heading (simulating a view that swaps as state changes). The heading keeps a stable test id while
 * its text changes per remount.
 */
function Harness() {
  const requestFocus = useRequestFocus();
  const focusRef = useFocusOnRequest();
  const [remountCount, setRemountCount] = useState(0);

  return (
    <div>
      <button onClick={() => requestFocus()}>request</button>
      <button onClick={() => setRemountCount((count) => count + 1)}>remount</button>
      <h2
        key={remountCount}
        ref={focusRef}
        data-testid='heading'
      >
        Heading {remountCount}
      </h2>
    </div>
  );
}

describe('ElementFocusProvider', () => {
  it('focuses elements that mount after focus is requested, and stays active across remounts', () => {
    render(
      <ElementFocusProvider>
        <Harness />
      </ElementFocusProvider>,
    );

    // No focus on initial mount when focus has not been requested.
    expect(screen.getByTestId('heading')).not.toHaveFocus();

    // Requesting focus does not move focus to an already-mounted element (its ref callback does not
    // run again).
    fireEvent.click(screen.getByText('request'));
    expect(screen.getByTestId('heading')).not.toHaveFocus();

    // The next element to mount after the request receives focus, and is made focusable.
    fireEvent.click(screen.getByText('remount'));
    expect(screen.getByTestId('heading')).toHaveFocus();
    expect(screen.getByTestId('heading')).toHaveTextContent('Heading 1');

    // The request stays active across further remounts, so the final element wins.
    fireEvent.click(screen.getByText('remount'));
    expect(screen.getByTestId('heading')).toHaveFocus();
    expect(screen.getByTestId('heading')).toHaveTextContent('Heading 2');
  });
});
