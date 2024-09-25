import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioBetaTag, type StudioBetaTagProps } from './StudioBetaTag';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioBetaTag', () => {
  it('should render the "Beta" text', () => {
    renderStudioBetaTag();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('Appends given classname to internal classname when no image is given', () => {
    testRootClassNameAppending((className) => renderStudioBetaTag({ className }));
  });
});

const renderStudioBetaTag = (props: Partial<StudioBetaTagProps> = {}) => {
  return render(<StudioBetaTag {...props} />);
};
