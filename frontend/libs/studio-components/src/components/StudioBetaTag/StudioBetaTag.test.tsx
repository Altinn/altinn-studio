import React from 'react';
import { render, RenderResult, screen } from '@testing-library/react';
import { StudioBetaTag } from './StudioBetaTag';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioBetaTag', () => {
  it('should render the "Beta" text', () => {
    renderStudioBetaTag();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('Appends given classname to the component', () => {
    testRootClassNameAppending((className) => renderStudioBetaTag({ className }));
  });
});

const renderStudioBetaTag = (props: Partial<StudioBetaTag> = {}): RenderResult => {
  return render(<StudioBetaTag {...props} />);
};
