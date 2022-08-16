import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnLogo } from './AltinnLogo';
import type { IAltinnLogoProps } from './AltinnLogo';

describe('AltinnLogo', () => {
  it('should have correct color', () => {
    render({ color: '#fff' });

    const group = screen.getByTestId('AltinnLogo-group');

    expect(group).toHaveAttribute('fill', '#fff');
  });
});

const render = (props: Partial<IAltinnLogoProps> = {}) => {
  const allProps = {
    color: '#000',
    ...props,
  };
  rtlRender(<AltinnLogo {...allProps} />);
};
