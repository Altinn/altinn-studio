import { useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AccordionItem } from './AccordionItem';

describe('AccordionItem', () => {
  it('renders the title and children', () => {
    render(
      <AccordionItem title='My section'>
        <p>Hidden until opened</p>
      </AccordionItem>,
    );

    expect(screen.getByText('My section')).toBeInTheDocument();
    expect(screen.getByText('Hidden until opened')).toBeInTheDocument();
  });

  it('starts closed by default and opens when the summary is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AccordionItem title='My section'>
        <p>Body</p>
      </AccordionItem>,
    );

    const details = screen.getByText('My section').closest('details');
    expect(details).not.toHaveAttribute('open');

    await user.click(screen.getByText('My section'));
    expect(details).toHaveAttribute('open');
  });

  it('honors defaultOpen', () => {
    render(
      <AccordionItem title='My section' defaultOpen>
        <p>Body</p>
      </AccordionItem>,
    );

    expect(screen.getByText('My section').closest('details')).toHaveAttribute('open');
  });

  it('is controlled when `open` is provided and calls onToggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    function ControlledHost() {
      const [open, setOpen] = useState(false);
      return (
        <AccordionItem
          title='My section'
          open={open}
          onToggle={(next) => {
            onToggle(next);
            setOpen(next);
          }}
        >
          <p>Body</p>
        </AccordionItem>
      );
    }

    render(<ControlledHost />);
    const details = screen.getByText('My section').closest('details');
    expect(details).not.toHaveAttribute('open');

    await user.click(screen.getByText('My section'));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(details).toHaveAttribute('open');
  });
});
