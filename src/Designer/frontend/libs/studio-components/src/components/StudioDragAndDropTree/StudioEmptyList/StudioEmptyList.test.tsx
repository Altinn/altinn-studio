import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioEmptyList, type StudioEmptyListProps } from './StudioEmptyList';

describe('StudioEmptyList', () => {
  it('should render empty content text when children are provided', () => {
    const childrenText = 'No items available';
    renderStudioEmptyList({ children: childrenText });
    expect(screen.getByText(childrenText)).toBeInTheDocument();
  });

  it('should render no content when no children are provided', () => {
    const { container } = renderStudioEmptyList();
    expect(container).toBeEmptyDOMElement();
  });
});

const renderStudioEmptyList = (children?: StudioEmptyListProps): ReturnType<typeof render> => {
  return render(<StudioEmptyList {...children} />);
};
