import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioPageHeaderLeft, type StudioPageHeaderLeftProps } from './StudioPageHeaderLeft';
import { StudioPageHeaderContext } from '../context';

describe('StudioPageHeaderLeft', () => {
  it('should render children when provided', () => {
    const childText = 'Child Content';
    renderStudioPageHeaderLeft({ children: <div>{childText}</div> });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should render DigdirLogoLink without title when children are not provided, and showTitle is false', () => {
    renderStudioPageHeaderLeft({ title: mockTitle, showTitle: false });

    expect(screen.getByTitle(mockTitle)).toBeInTheDocument();
    expect(screen.queryByText(mockTitle)).not.toBeInTheDocument();
  });

  it('should render DigdirLogoLink title when children are not provided, and showTitle is true', () => {
    renderStudioPageHeaderLeft({ title: mockTitle, showTitle: true });

    expect(screen.getByTitle(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockTitle)).toBeInTheDocument();
  });
});

const mockTitle: string = 'title';

const defaultProps: StudioPageHeaderLeftProps = {
  title: mockTitle,
  showTitle: false,
};

const renderStudioPageHeaderLeft = (
  props: Partial<StudioPageHeaderLeftProps> = {},
): RenderResult => {
  return render(
    <StudioPageHeaderContext.Provider value={{ variant: 'regular' }}>
      <StudioPageHeaderLeft {...defaultProps} {...props} />
    </StudioPageHeaderContext.Provider>,
  );
};
