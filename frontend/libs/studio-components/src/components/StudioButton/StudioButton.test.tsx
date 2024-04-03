import type { RefObject } from 'react';
import React, { createRef } from 'react';
import type { StudioButtonProps } from './StudioButton';
import { StudioButton } from './StudioButton';
import { render, screen } from '@testing-library/react';
import type { IconPlacement } from '../../types/IconPlacement';

// Mocks:
jest.mock('./StudioButton.module.css', () => ({
  studioButton: 'studioButton',
}));

describe('StudioButton', () => {
  const iconPlacementCases: IconPlacement[] = [undefined, 'left', 'right'];

  it('Renders a button with the given content', () => {
    const children = 'Button content';
    renderButton({ children });
    expect(screen.getByRole('button', { name: children })).toBeInTheDocument();
  });

  it.each(iconPlacementCases)(
    'Renders a button with the given icon when iconPlacement is %s and there is no content',
    (iconPlacement) => {
      const iconTestId = 'icon';
      const icon = <span data-testid={iconTestId} />;
      renderButton({ icon, iconPlacement });
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );

  it.each(iconPlacementCases)(
    'Renders a button with the given content and icon when iconPlacement is %s',
    (iconPlacement) => {
      const children = 'Button content';
      const iconTestId = 'icon';
      const icon = <span data-testid={iconTestId} />;
      renderButton({ icon, iconPlacement, children });
      expect(screen.getByRole('button', { name: children })).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );

  it('Appends given classname to internal classname', () => {
    const className = 'test-class';
    const { container } = renderButton({ className });
    expect(container.firstChild).toHaveClass(className); // eslint-disable-line testing-library/no-node-access
    expect(container.firstChild).toHaveClass('studioButton'); // eslint-disable-line testing-library/no-node-access
  });

  it('Forwards the ref object to the button element if given', () => {
    const ref = createRef<HTMLButtonElement>();
    renderButton({ children: 'Test' }, ref);
    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('Supports polymorphism', () => {
    render(
      <StudioButton as='a' href='/'>
        Test
      </StudioButton>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});

const renderButton = (props: StudioButtonProps, ref?: RefObject<HTMLButtonElement>) =>
  render(<StudioButton {...props} ref={ref} />);
