import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioDivider } from './StudioDivider';

describe('StudioDivider', () => {
  it('should render a divider element', () => {
    render(<StudioDivider />);
    const divider = screen.getByRole('separator', { hidden: true });
    expect(divider).toBeInTheDocument();
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLHRElement>();
    render(<StudioDivider ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLHRElement);
  });
});
