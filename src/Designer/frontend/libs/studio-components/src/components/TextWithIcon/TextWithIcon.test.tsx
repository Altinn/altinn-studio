import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TextWithIcon } from './TextWithIcon';
import type { TextWithIconProps } from './TextWithIcon';

const mockChildren: string = 'Test Text';

describe('TextWithIcon', () => {
  beforeEach(jest.clearAllMocks);

  it('renders children correctly', () => {
    renderTextWithIcon();
    expect(screen.getByText(mockChildren)).toBeInTheDocument();
  });

  it('renders icon on the left when iconPlacement is "left"', () => {
    const iconText: string = 'Icon';
    const { container } = renderTextWithIcon({
      icon: <span>{iconText}</span>,
      iconPlacement: 'left',
    });
    expect(container.childNodes[0].textContent).toBe(`${iconText}${mockChildren}`);
  });

  it('renders icon on the right when iconPlacement is "right"', () => {
    const iconText: string = 'Icon';
    const { container } = renderTextWithIcon({
      icon: <span>{iconText}</span>,
      iconPlacement: 'right',
    });
    expect(container.childNodes[0].textContent).toBe(`${mockChildren}${iconText}`);
  });

  it('does not render icon when icon is not provided', () => {
    const { container } = renderTextWithIcon();

    expect(container.childNodes[0].textContent).toBe(mockChildren);
    expect(container.childNodes[0]).not.toHaveAttribute('className', 'iconWrapper');
  });
});

const defaultProps: TextWithIconProps = {
  children: mockChildren,
};

const renderTextWithIcon = (props: Partial<TextWithIconProps> = {}): RenderResult => {
  return render(<TextWithIcon {...defaultProps} {...props} />);
};
