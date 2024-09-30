import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioProfileMenuLink, type StudioProfileMenuLinkProps } from './StudioProfileMenuLink';

const mockItemName: string = 'item';
const mockHref: string = '/href';

describe('StudioProfileMenuLink', () => {
  it('should render the link with correct text and href', () => {
    renderStudioProfileMenuLink();

    const linkElement = screen.getByRole('menuitem', { name: mockItemName });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', mockHref);
  });

  it('should open the link in the same tab when openInNewTab is false or not provided', () => {
    renderStudioProfileMenuLink();

    const linkElement = screen.getByRole('menuitem', { name: mockItemName });
    expect(linkElement).not.toHaveAttribute('target', '_blank');
    expect(linkElement).not.toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should open the link in a new tab when openInNewTab is true', () => {
    renderStudioProfileMenuLink({ openInNewTab: true });

    const linkElement = screen.getByRole('menuitem', { name: mockItemName });
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

const defaultProps: StudioProfileMenuLinkProps = {
  itemName: mockItemName,
  href: mockHref,
};

const renderStudioProfileMenuLink = (props: Partial<StudioProfileMenuLinkProps> = {}) => {
  return render(<StudioProfileMenuLink {...defaultProps} {...props} />);
};
