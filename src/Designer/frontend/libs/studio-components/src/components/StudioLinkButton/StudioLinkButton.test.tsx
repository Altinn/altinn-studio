import React, { type Ref } from 'react';
import { StudioLinkButton, type StudioLinkButtonProps } from './StudioLinkButton';
import { screen, render, type RenderResult } from '@testing-library/react';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const linkText: string = 'Click me';

describe('StudioLinkButton', () => {
  it('should render children correctly', () => {
    renderStudioLinkButton();
    expect(screen.getByText(linkText)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioLinkButton({ className }));
  });

  it('Appends custom attributes to the link element', () => {
    testCustomAttributes(renderStudioLinkButton);
  });

  it('should disable  link button', () => {
    renderStudioLinkButton({ disabled: true });
    const linkButton = screen.getByRole('link', { name: linkText });
    expect(linkButton).toHaveClass('disabled');
  });
});

const defaultProps: Partial<StudioLinkButtonProps> = {
  href: 'testHref',
  disabled: false,
};

const renderStudioLinkButton = (
  props: Partial<StudioLinkButtonProps> = {},
  ref?: Ref<HTMLAnchorElement>,
): RenderResult => {
  return render(
    <StudioLinkButton {...defaultProps} {...props} ref={ref}>
      Click me
    </StudioLinkButton>,
  );
};
