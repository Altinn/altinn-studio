import { render, screen } from '@testing-library/react';

import { LoadingWrapper } from './LoadingWrapper';

describe('LoadingWrapper', () => {
  it('renders children inside a div with the data-loading attribute', () => {
    render(
      <LoadingWrapper>
        <span>child content</span>
      </LoadingWrapper>,
    );

    const child = screen.getByText('child content');
    expect(child).toBeInTheDocument();
    expect(child.parentElement).toHaveAttribute('data-loading');
  });

  it('forwards HTML attributes to the wrapper div', () => {
    render(
      <LoadingWrapper id='my-wrapper' className='custom' aria-label='loading region'>
        <span>child</span>
      </LoadingWrapper>,
    );

    const wrapper = document.getElementById('my-wrapper');
    expect(wrapper).toHaveClass('custom');
    expect(wrapper).toHaveAttribute('aria-label', 'loading region');
    expect(wrapper).toHaveAttribute('data-loading');
  });
});
