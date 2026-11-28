import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StudioTooltip } from './StudioTooltip';

describe('StudioTooltip', () => {
  it('describes the element it wraps with its text', async () => {
    render(
      <StudioTooltip content='The errors'>
        <button>Errors</button>
      </StudioTooltip>,
    );

    const button = screen.getByRole('button', { name: 'Errors' });
    expect(button).toHaveAttribute('data-tooltip', 'The errors');
    await waitFor(() => expect(button).toHaveAttribute('aria-description', 'The errors'));
  });

  it('names an element without a name of its own with its text', async () => {
    render(
      <StudioTooltip content='The errors'>
        <button />
      </StudioTooltip>,
    );

    expect(await screen.findByRole('button', { name: 'The errors' })).toBeInTheDocument();
  });
});
