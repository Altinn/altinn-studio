import React from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioErrorSummary } from './index';
import type { StudioErrorSummaryProps } from './index';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

describe('StudioErrorSummary', () => {
  it('Appends custom attributes', () => {
    testCustomAttributes(renderStudioErrorSummary);
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderStudioErrorSummary({ className }));
  });

  it('Renders the heading', () => {
    renderStudioErrorSummary({});
    expect(screen.getByText(heading)).toBeInTheDocument();
  });

  it('Renders the list of items', () => {
    renderStudioErrorSummary({});
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText(item1)).toBeInTheDocument();
    expect(screen.getByText(item2)).toBeInTheDocument();
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderStudioErrorSummary({}, ref));
  });
});

const heading: string = 'Test Heading';
const item1: string = 'Test Item 1';
const item2: string = 'Test Item 2';

function renderStudioErrorSummary(
  props: StudioErrorSummaryProps,
  ref?: Ref<HTMLDivElement>,
): RenderResult {
  return render(
    <StudioErrorSummary {...props} ref={ref}>
      <StudioErrorSummary.Heading>{heading}</StudioErrorSummary.Heading>
      <StudioErrorSummary.List>
        <StudioErrorSummary.Item>
          <StudioErrorSummary.Link href='#test-link'>{item1}</StudioErrorSummary.Link>
        </StudioErrorSummary.Item>
        <StudioErrorSummary.Item>
          <StudioErrorSummary.Link href='#test-link-2'>{item2}</StudioErrorSummary.Link>
        </StudioErrorSummary.Item>
      </StudioErrorSummary.List>
    </StudioErrorSummary>,
  );
}
