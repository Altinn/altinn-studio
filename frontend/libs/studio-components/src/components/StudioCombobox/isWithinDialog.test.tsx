import React from 'react';
import { render, screen } from '@testing-library/react';
import { isWithinDialog } from './isWithinDialog';

describe('isWithinDialog', () => {
  it('Returns true when the element is inside a dialog', () => {
    render(
      <dialog open>
        <button />
      </dialog>,
    );
    const button = screen.getByRole('button');
    expect(isWithinDialog(button)).toBe(true);
  });

  it('Returns false when the element is not inside a dialog', () => {
    render(<button />);
    const button = screen.getByRole('button');
    expect(isWithinDialog(button)).toBe(false);
  });
});
