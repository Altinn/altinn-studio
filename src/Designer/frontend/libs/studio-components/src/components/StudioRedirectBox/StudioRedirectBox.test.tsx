import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioRedirectBox, type StudioRedirectBoxProps } from './StudioRedirectBox';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const mockTitle: string = 'title';

const defaultProps: StudioRedirectBoxProps = {
  title: mockTitle,
  children: <div />,
};

describe('StudioRedirectBox', () => {
  it('should render the title and children', () => {
    const mockChildrenText: string = 'children';
    renderStudioRedirectBox({ children: <p>{mockChildrenText}</p> });

    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockChildrenText)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioRedirectBox({ className }));
  });
});

const renderStudioRedirectBox = (props: Partial<StudioRedirectBoxProps> = {}): RenderResult => {
  return render(<StudioRedirectBox {...defaultProps} {...props} />);
};
