import { render } from '@testing-library/react';

import { Divider } from './Divider';

describe('Divider', () => {
  it('renders an <hr> element', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('passes the id through to the underlying element', () => {
    const { container } = render(<Divider id='my-divider' />);
    expect(container.querySelector('hr')).toHaveAttribute('id', 'my-divider');
  });
});
