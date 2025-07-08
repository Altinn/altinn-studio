import React from 'react';
import type { Ref } from 'react';
import type { StudioButtonProps } from './StudioButton';
import { StudioButton } from './StudioButton';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { IconPlacement } from '../../types/IconPlacement';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const iconPlacementCases: IconPlacement[] = ['left', 'right'];
const iconTestId: string = 'icon';

describe('StudioButton', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders a button with the given content', () => {
    const children = 'Button content';
    renderButton({ children });
    expect(getButtonByName(children)).toBeInTheDocument();
  });

  it.each(iconPlacementCases)(
    'Renders a button with the given icon when iconPlacement is %s and there is no content',
    (iconPlacement) => {
      const icon = <span data-testid={iconTestId} />;
      renderButton({ icon, iconPlacement });
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );

  it.each(iconPlacementCases)(
    'Renders a button with the given content and icon when iconPlacement is %s',
    (iconPlacement) => {
      const children = 'Button content';
      const icon = <span data-testid={iconTestId} />;
      renderButton({ icon, iconPlacement, children });
      expect(getButtonByName(children)).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );

  it('Appends custom attributes to the button element', () => {
    testCustomAttributes(renderButton);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderButton({ className }));
  });

  it('Forwards the ref', () => {
    const children = 'Button content';
    testRefForwarding<HTMLButtonElement>((ref) => renderButton({ children }, ref), getButton);
  });
});

const renderButton = (props: StudioButtonProps, ref?: Ref<HTMLButtonElement>): RenderResult =>
  render(<StudioButton {...props} ref={ref} />);

const getButtonByName = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
const getButton = (): HTMLButtonElement => screen.getByRole('button');
