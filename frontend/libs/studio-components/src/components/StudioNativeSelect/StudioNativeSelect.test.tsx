import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioNativeSelect, type StudioNativeSelectProps } from './StudioNativeSelect';

const mockLabel: string = 'Select label';
const mockDescription: string = 'Description';
const mockId: string = 'select-id';
const defaultProps: StudioNativeSelectProps = {
  id: mockId,
  label: mockLabel,
};

describe('StudioNativeSelect', () => {
  afterEach(jest.clearAllMocks);

  it('adds description and aria-describedby attribute when description is present', () => {
    render(<StudioNativeSelect {...defaultProps} description={mockDescription} />);

    const descriptionElement = screen.getByText(mockDescription);
    expect(descriptionElement).toBeInTheDocument();

    const select = screen.getByLabelText(mockLabel);
    expect(select).toHaveAttribute('aria-describedby', 'studio-native-select-description');
  });

  it('does not add aria-describedby attribute when description is not provided', () => {
    render(<StudioNativeSelect {...defaultProps} />);

    const select = screen.getByLabelText(mockLabel);
    expect(select).not.toHaveAttribute('aria-describedby', 'studio-native-select-description');
  });
});
