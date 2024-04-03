import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import type { AltinnSubMenuProps } from './AltinnSubMenu';
import { AltinnSubMenu } from './AltinnSubMenu';

describe('AltinnSubMenu', () => {
  it('should render provided child components', () => {
    render({
      children: <button>test-button</button>,
    });
    expect(screen.getByRole('button', { name: 'test-button' })).toBeInTheDocument();
  });
});

const render = (props?: Partial<AltinnSubMenuProps>) => {
  const defaultProps: AltinnSubMenuProps = {
    variant: 'regular',
    children: null,
  };
  return rtlRender(<AltinnSubMenu {...defaultProps} {...props} />);
};
