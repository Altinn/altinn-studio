import React from 'react';
import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCard } from './StudioCard';
import type { StudioCardProps } from './StudioCard';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

// Test data:
const children = 'Lorem ipsum dolor sit amet';
const defaultProps: StudioCardProps = { children };

describe('StudioCard', () => {
  it('Appends custom attributes to the card element', () => {
    testCustomAttributes(renderCard);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderCard({ className }));
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderCard({}, ref));
  });

  it('Renders children', () => {
    renderCard();
    expect(screen.getByText(children)).toBeInTheDocument();
  });
});

const renderCard = (
  props: Partial<StudioCardProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult => render(<StudioCard {...defaultProps} {...props} ref={ref} />);
