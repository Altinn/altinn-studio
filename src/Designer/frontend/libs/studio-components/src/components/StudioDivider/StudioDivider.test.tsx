import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioDivider } from './StudioDivider';

describe('StudioDivider', () => {
  it('should render a divider element', () => {
    render(<StudioDivider />);
    const divider = screen.getByRole('separator', { hidden: true });
    expect(divider).toBeInTheDocument();
  });

  it('should render a vertical divider when the orientation is vertical', () => {
    render(<StudioDivider orientation='vertical' />);
    const divider = screen.getByRole('separator', { hidden: true });
    expect(divider).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLHRElement>();
    render(<StudioDivider ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLHRElement);
  });
});
