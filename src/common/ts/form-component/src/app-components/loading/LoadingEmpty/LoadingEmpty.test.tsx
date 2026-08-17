import { render } from '@testing-library/react';

import { LoadingEmpty } from './LoadingEmpty';

describe('LoadingEmpty', () => {
  it('renders a hidden div with the data-loading attribute', () => {
    const { container } = render(<LoadingEmpty />);

    const element = container.firstChild as HTMLElement;
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('data-loading');
    expect(element).toHaveStyle({ display: 'none' });
  });
});
