import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeaderRight, type StudioPageHeaderRightProps } from './StudioPageHeaderRight';

describe('StudioPageHeaderRight', () => {
  it('should render the children passed as prop', () => {
    const childText = 'Test Child';
    renderStudioPageHeaderRight({ children: <span>{childText}</span> });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should render multiple children elements', () => {
    renderStudioPageHeaderRight({
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

const renderStudioPageHeaderRight = (props: StudioPageHeaderRightProps) => {
  return render(<StudioPageHeaderRight {...props} />);
};
