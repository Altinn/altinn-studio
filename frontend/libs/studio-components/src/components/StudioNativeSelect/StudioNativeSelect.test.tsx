import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioNativeSelect,
  type StudioNativeSelectProps,
  type SelectOption,
} from './StudioNativeSelect';

const optionValue1: string = '1';
const optionValue2: string = '2';

const optionLabel1: string = 'Option 1';
const optionLabel2: string = 'Option 2';

const options: SelectOption[] = [
  { value: optionValue1, label: optionLabel1 },
  { value: optionValue2, label: optionLabel2 },
];
const mockLabel: string = 'Select label';
const mockDescription: string = 'Description';
const mockId: string = 'select-id';
const defaultProps: StudioNativeSelectProps = {
  options,
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
