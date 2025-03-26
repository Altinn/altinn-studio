import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconWithTextComponent } from './IconWithTextComponent';
import type { IconWithTextComponentProps } from './IconWithTextComponent';

const mockChildren: string = 'Test Text';

describe('IconWithTextComponent', () => {
  it('renders children correctly', () => {
    renderIconWithTextComponent();
    expect(screen.getByText(mockChildren)).toBeInTheDocument();
  });

  it('renders icon on the left when iconPlacement is "left"', () => {
    const iconText: string = 'Icon';
    const { container } = renderIconWithTextComponent({
      icon: <span>{iconText}</span>,
      iconPlacement: 'left',
    });
    expect(container.childNodes[0].textContent).toBe(`${iconText}${mockChildren}`);
  });

  it('renders icon on the right when iconPlacement is "right"', () => {
    const iconText: string = 'Icon';
    const { container } = renderIconWithTextComponent({
      icon: <span>{iconText}</span>,
      iconPlacement: 'right',
    });
    expect(container.childNodes[0].textContent).toBe(`${mockChildren}${iconText}`);
  });

  it('does not render icon when icon is not provided', () => {
    const { container } = renderIconWithTextComponent();

    expect(container.childNodes[0].textContent).toBe(mockChildren);
    expect(container.childNodes[0]).not.toHaveAttribute('className', 'iconWrapper');
  });
});

const defaultProps: IconWithTextComponentProps = {
  children: mockChildren,
};

const renderIconWithTextComponent = (props: Partial<IconWithTextComponentProps> = {}) => {
  return render(<IconWithTextComponent {...defaultProps} {...props} />);
};
