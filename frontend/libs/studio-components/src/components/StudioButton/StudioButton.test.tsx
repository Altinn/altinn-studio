import React from 'react';
import type { StudioButtonProps } from './StudioButton';
import { StudioButton } from './StudioButton';
import { render, screen } from '@testing-library/react';
import type { IconPlacement } from '../../types/IconPlacement';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

// Mocks:
jest.mock('./StudioButton.module.css', () => ({
  studioButton: 'studioButton',
}));

describe('StudioButton', () => {
  const iconPlacementCases: IconPlacement[] = [undefined, 'left', 'right'];

  it('Renders a button with the given content', () => {
    const children = 'Button content';
    renderButton({ children });
    expect(getButtonByName(children)).toBeInTheDocument();
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
      expect(getButtonByName(children)).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );

  it('Appends custom attributes to the button element', () => {
    testCustomAttributes(renderButton, getButton);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderButton({ className }));
  });
});

const renderButton = (props: StudioButtonProps) => render(<StudioButton {...props} />);

const getButton = (): HTMLButtonElement => screen.getByRole('button') as HTMLButtonElement;
const getButtonByName = (name: string): HTMLButtonElement =>
  screen.getByRole('button', { name }) as HTMLButtonElement;
