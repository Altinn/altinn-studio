import type { HTMLAttributes } from 'react';
import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { StudioPageHeaderLinkProps } from './StudioPageHeaderLink';
import { StudioPageHeaderLink } from './StudioPageHeaderLink';

// Test data:
const linkText: string = 'Text';
const renderLink = (props: HTMLAttributes<HTMLAnchorElement>) => (
  <a {...props} href='#'>
    {linkText}
  </a>
);
const defaultProps: StudioPageHeaderLinkProps = {
  color: 'dark',
  variant: 'regular',
  renderLink,
};

describe('StudioPageHeaderLink', () => {
  it('Renders the link', () => {
    renderStudioPageHeaderLink();
    expect(screen.getByRole('link', { name: linkText })).toBeInTheDocument();
  });

  it('Passes the colour and variant classes to the link', () => {
    renderStudioPageHeaderLink();
    const link = screen.getByRole('link');
    expect(link).toHaveClass(defaultProps.color);
    expect(link).toHaveClass(defaultProps.variant);
  });
});

function renderStudioPageHeaderLink(props: Partial<StudioPageHeaderLinkProps> = {}): RenderResult {
  return render(<StudioPageHeaderLink {...defaultProps} {...props} />);
}
