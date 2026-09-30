import { render, screen } from '@testing-library/react';

import { LiveValidationMessage } from './LiveValidationMessage';

describe('LiveValidationMessage', () => {
  it('keeps a polite aria-live region (with the given id) mounted, and only shows the message when show is true', () => {
    const { container, rerender } = render(
      <LiveValidationMessage show={false} id='my-error'>
        Error message
      </LiveValidationMessage>,
    );

    const region = container.querySelector('#my-error');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByText('Error message')).not.toBeInTheDocument();

    rerender(
      <LiveValidationMessage show id='my-error'>
        Error message
      </LiveValidationMessage>,
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('supports an assertive live region', () => {
    const { container } = render(
      <LiveValidationMessage show={false} live='assertive'>
        Error message
      </LiveValidationMessage>,
    );

    expect(container.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'assertive');
  });
});
