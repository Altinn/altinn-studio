import { render, screen } from '@testing-library/react';

import { HelpTextIcon } from './HelpTextIcon';
import type { HelpTextIconProps } from './HelpTextIcon';

const className = 'test-class';
const defaultProps: HelpTextIconProps = {
  className,
  openState: true,
};

const renderIcon = (props: Partial<HelpTextIconProps> = {}) =>
  render(<HelpTextIcon {...defaultProps} {...props} />);

const getIcon = () => screen.getByRole('img', { hidden: true });

describe('HelpTextIcon', () => {
  it('renders an icon', () => {
    renderIcon();
    expect(getIcon()).toBeInTheDocument();
  });

  it('renders with correct path when filled is true', () => {
    renderIcon({ filled: true });
    expect(getIcon().firstChild).toHaveAttribute(
      'd',
      expect.stringMatching(
        /^M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0Zm0 16/,
      ),
    );
  });

  it('renders with correct path when filled is false', () => {
    renderIcon({ filled: false });
    expect(getIcon().firstChild).toHaveAttribute(
      'd',
      expect.stringMatching(
        /^M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0Zm0 2C/,
      ),
    );
  });

  it('renders with given className', () => {
    renderIcon({ className });
    expect(getIcon()).toHaveClass(className);
  });

  it('renders with data-state="open" when openState is true', () => {
    renderIcon({ openState: true });
    expect(getIcon()).toHaveAttribute('data-state', 'open');
  });

  it('renders with data-state="closed" when openState is false', () => {
    renderIcon({ openState: false });
    expect(getIcon()).toHaveAttribute('data-state', 'closed');
  });
});
