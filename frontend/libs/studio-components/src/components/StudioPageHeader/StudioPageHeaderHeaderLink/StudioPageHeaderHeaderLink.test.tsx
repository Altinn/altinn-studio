import type { HTMLAttributes } from 'react';
import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { StudioPageHeaderHeaderLinkProps } from './StudioPageHeaderHeaderLink';
import { StudioPageHeaderHeaderLink } from './StudioPageHeaderHeaderLink';

// Test data:
const linkText: string = 'Text';
const renderLink = (props: HTMLAttributes<HTMLAnchorElement>) => (
  <a {...props} href='#'>
    {linkText}
  </a>
);
const defaultProps: StudioPageHeaderHeaderLinkProps = {
  color: 'dark',
  variant: 'regular',
  renderLink,
};

describe('StudioPageHeaderHeaderLink', () => {
  it('Renders the link', () => {
    renderStudioPageHeaderHeaderLink();
    expect(screen.getByRole('link', { name: linkText })).toBeInTheDocument();
  });

  it('Passes the colour and variant classes to the link', () => {
    renderStudioPageHeaderHeaderLink();
    const link = screen.getByRole('link');
    expect(link).toHaveClass(defaultProps.color);
    expect(link).toHaveClass(defaultProps.variant);
  });
});

function renderStudioPageHeaderHeaderLink(
  props: Partial<StudioPageHeaderHeaderLinkProps> = {},
): RenderResult {
  return render(<StudioPageHeaderHeaderLink {...defaultProps} {...props} />);
}
