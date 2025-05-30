import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioErrorSummary } from './';
import type { StudioErrorSummaryProps } from './';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

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
});

const heading: string = 'Test Heading';
const item1: string = 'Test Item 1';
const item2: string = 'Test Item 2';

function renderStudioErrorSummary(props: StudioErrorSummaryProps): RenderResult {
  return render(
    <StudioErrorSummary {...props}>
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
