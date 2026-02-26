import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeaderCenter, type StudioPageHeaderCenterProps } from './StudioPageHeaderCenter';

describe('StudioPageHeaderCenter', () => {
  it('should render the children passed as prop', () => {
    const childText = 'Test Child';
    renderStudioPageHeaderCenter({ children: <span>{childText}</span> });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should render multiple children elements', () => {
    renderStudioPageHeaderCenter({
      children: (
        <>
          <span>Child 1</span>
          <span>Child 2</span>
        </>
      ),
    });

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});

const renderStudioPageHeaderCenter = (
  props: StudioPageHeaderCenterProps,
): ReturnType<typeof render> => {
  return render(<StudioPageHeaderCenter {...props} />);
};
