import React, { createRef } from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioLink } from './StudioLink';
import type { StudioLinkProps } from './StudioLink';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import type { IconPlacement } from '../../types/IconPlacement';

const mockLinkText: string = 'Test Link';
const iconPlacementCases: IconPlacement[] = ['left', 'right'];
const iconTestId: string = 'icon';

describe('StudioLink', () => {
  it('renders children correctly', () => {
    renderStudioLink();
    expect(getLink(mockLinkText)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderStudioLink({ 'data-size': 'lg' });
    expect(getLink(mockLinkText).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioLink({ className }));
  });

  it('Appends custom attributes to the link element', () => {
    testCustomAttributes(renderStudioLink);
  });

  it('forwards ref to the link element', () => {
    const ref = createRef<HTMLAnchorElement>();
    renderStudioLink({}, ref);
    expect(ref.current).toBe(getLink(mockLinkText));
  });

  it.each(iconPlacementCases)(
    'Renders a link with the given icon when iconPlacement is %s and there is no content',
    (iconPlacement) => {
      const icon = <span data-testid={iconTestId} />;
      renderStudioLink({ icon, iconPlacement });
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );

  it.each(iconPlacementCases)(
    'Renders a link with the given content and icon when iconPlacement is %s',
    (iconPlacement) => {
      const icon = <span data-testid={iconTestId} />;
      renderStudioLink({ icon, iconPlacement });
      expect(getLink(mockLinkText)).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    },
  );
});

const defaultProps: Partial<StudioLinkProps> = {
  href: 'testHref',
};

const renderStudioLink = (
  props: Partial<StudioLinkProps> = {},
  ref?: Ref<HTMLAnchorElement>,
): RenderResult => {
  return render(
    <StudioLink {...defaultProps} {...props} ref={ref}>
      {mockLinkText}
    </StudioLink>,
  );
};

const getLink = (name: string): HTMLAnchorElement => screen.getByRole('link', { name });
