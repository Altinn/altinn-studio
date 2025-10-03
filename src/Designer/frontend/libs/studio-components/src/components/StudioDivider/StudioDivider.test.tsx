import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioDivider, type StudioDividerProps } from './StudioDivider';

describe('StudioDivider', () => {
  it('renders a divider element', () => {
    renderStudioDivider();
    const divider = getDivider();
    expect(divider).toBeInTheDocument();
  });

  it('applies default color class by default', () => {
    renderStudioDivider();
    const divider = getDivider();
    expect(divider).toHaveClass('default');
  });

  it('applies strong color class when color prop is "strong"', () => {
    renderStudioDivider({ color: 'strong' });
    const divider = getDivider();
    expect(divider).toHaveClass('strong');
  });

  it('applies subtle color class when color prop is "subtle"', () => {
    renderStudioDivider({ color: 'subtle' });
    const divider = getDivider();
    expect(divider).toHaveClass('subtle');
  });
});

const getDivider = (): HTMLElement => screen.getByRole('separator', { hidden: true });

const renderStudioDivider = (
  props: Partial<StudioDividerProps> = {},
  ref?: React.Ref<HTMLHRElement>,
): RenderResult => {
  return render(<StudioDivider ref={ref} {...props} />);
};
