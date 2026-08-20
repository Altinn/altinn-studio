import { render, screen } from '@testing-library/react';

import { FatalError } from './FatalError';
import { FatalErrorEmpty } from './FatalErrorEmpty';

describe('FatalError', () => {
  it('renders children inside a div with data-fatal-error', () => {
    render(
      <FatalError>
        <span>Something went wrong</span>
      </FatalError>,
    );

    const child = screen.getByText('Something went wrong');
    expect(child).toBeInTheDocument();
    expect(child.parentElement).toHaveAttribute('data-fatal-error');
  });

  it('forwards additional props to the underlying div', () => {
    render(
      <FatalError className='custom' data-testid='fatal'>
        content
      </FatalError>,
    );

    const wrapper = screen.getByTestId('fatal');
    expect(wrapper).toHaveAttribute('data-fatal-error');
    expect(wrapper).toHaveClass('custom');
  });
});

describe('FatalErrorEmpty', () => {
  it('renders a hidden div with data-fatal-error and no content', () => {
    const { container } = render(<FatalErrorEmpty />);
    const div = container.querySelector('[data-fatal-error]');

    expect(div).toBeInTheDocument();
    expect(div).toHaveStyle({ display: 'none' });
    expect(div?.children).toHaveLength(0);
  });
});
