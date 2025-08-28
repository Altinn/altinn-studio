import React from 'react';
import { render, screen } from '@testing-library/react';
import { GiteaFetchCompleted, type GiteaFetchCompletedProps } from './GiteaFetchCompleted';

const mockHeading: string = 'Heading';

const defaultProps: GiteaFetchCompletedProps = {
  heading: mockHeading,
};

describe('GiteaFetchCompleted', () => {
  afterEach(jest.clearAllMocks);

  it('should render the heading text passed as prop', () => {
    render(<GiteaFetchCompleted {...defaultProps} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(mockHeading);
  });
});
