import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeaderLeft, type StudioPageHeaderLeftProps } from './StudioPageHeaderLeft';
import { StudioPageHeaderContext } from '../context';

describe('StudioPageHeaderLeft', () => {
  it('should render children when provided', () => {
    const childText = 'Child Content';
    renderStudioPageHeaderLeft({ children: <div>{childText}</div> });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should render DigdirLogoLink when children are not provided', () => {
    const title = 'Test Title';
    renderStudioPageHeaderLeft({ title });

    expect(screen.getByText(title)).toBeInTheDocument();
  });
});

const renderStudioPageHeaderLeft = (props: Partial<StudioPageHeaderLeftProps> = {}) => {
  return render(
    <StudioPageHeaderContext.Provider value={{ variant: 'regular' }}>
      <StudioPageHeaderLeft {...props} />
    </StudioPageHeaderContext.Provider>,
  );
};
