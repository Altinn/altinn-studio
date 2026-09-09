import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from './Button';

describe('Button', () => {
  it('renders children and forwards click events', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Save</Button>);

    const btn = screen.getByRole('button', { name: 'Save' });
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables and shows a spinner when isLoading', () => {
    render(<Button isLoading>Submitting</Button>);

    const btn = screen.getByRole('button', { name: /Submitting/ });
    expect(btn).toBeDisabled();
  });

  it('respects an explicit disabled prop', () => {
    render(<Button disabled>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('passes through aria-label and title as already-translated strings', () => {
    render(
      <Button aria-label='Lukk dialog' title='Lukk dialog'>
        X
      </Button>,
    );

    const btn = screen.getByRole('button', { name: 'Lukk dialog' });
    expect(btn).toHaveAttribute('title', 'Lukk dialog');
  });

  it('forwards refs to the underlying button element', () => {
    const ref = { current: null as HTMLButtonElement | null };

    render(<Button ref={ref}>Save</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
