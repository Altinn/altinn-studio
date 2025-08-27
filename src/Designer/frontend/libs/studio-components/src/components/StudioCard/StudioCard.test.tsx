import React from 'react';
import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCard } from './index';
import type { StudioCardProps, StudioCardBlockProps } from './index';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

// Test data:
const children = 'Lorem ipsum dolor sit amet';
const defaultProps: StudioCardProps = { children };
const blockContent = 'Block content';
const defaultBlockProps: StudioCardBlockProps = { children: blockContent };

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

  describe('StudioCard.Block', () => {
    it('Renders children', () => {
      renderCardWithBlock();
      expect(screen.getByText(blockContent)).toBeInTheDocument();
    });

    it('Forwards the ref', () => {
      const testId = 'test-block';
      const props = { 'data-testid': testId } as Partial<StudioCardBlockProps>;
      testRefForwarding<HTMLDivElement>(
        (ref) => renderCardWithBlock(props, ref),
        () => screen.getByTestId(testId),
      );
    });

    it('Appends custom attributes to the block element', () => {
      const testId = 'test-block';
      const props = { 'data-testid': testId } as Partial<StudioCardBlockProps>;
      testCustomAttributes(
        (attr) => renderCardWithBlock({ ...attr, ...props }),
        () => screen.getByTestId(testId),
      );
    });
  });
});

const renderCard = (
  props: Partial<StudioCardProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult => render(<StudioCard {...defaultProps} {...props} ref={ref} />);

const renderCardWithBlock = (
  props: Partial<StudioCardBlockProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult =>
  render(
    <StudioCard>
      <StudioCard.Block {...defaultBlockProps} {...props} ref={ref} />
    </StudioCard>,
  );
