import { render, screen } from '@testing-library/react';
import { ConfigSurface } from './ConfigSurface';
import React from 'react';

describe('ConfigSurface', () => {
  it('should render children', () => {
    render(
      <ConfigSurface>
        <button>My button</button>
      </ConfigSurface>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should support ...rest props', () => {
    render(
      <ConfigSurface className='test-class-name' data-testid='configSurface'>
        <button>My button</button>
      </ConfigSurface>,
    );

    expect(screen.getByTestId('configSurface')).toHaveClass('test-class-name');
  });
});
