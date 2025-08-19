import React from 'react';
import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioActionCard, type StudioActionCardProps } from './StudioActionCard';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import userEvent from '@testing-library/user-event';

const label = 'Add new action';
const defaultProps: StudioActionCardProps = {
  label,
  onAction: jest.fn(),
};

describe('StudioActionCard', () => {
  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderActionCard({ className }));
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderActionCard({}, ref));
  });

  it('Renders the label', () => {
    renderActionCard();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Calls onAction when clicked', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    renderActionCard({ onAction });
    await user.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('Calls onAction when pressing Enter or Space', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    renderActionCard({ onAction });
    const actionCard = screen.getByRole('button');
    actionCard.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onAction).toHaveBeenCalledTimes(2);
  });
});

const renderActionCard = (
  props: Partial<React.ComponentProps<typeof StudioActionCard>> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult => render(<StudioActionCard {...defaultProps} {...props} ref={ref} />);
