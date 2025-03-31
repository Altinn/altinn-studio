import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioSelect } from './';
import type { StudioSelectProps } from './';

describe('StudioSelect', () => {
  beforeEach(jest.clearAllMocks);

  it('renders the label correctly', () => {
    renderStudioSelect();
    expect(getLabel(mockLabel)).toBeInTheDocument();
  });

  it('renders the select element', () => {
    renderStudioSelect();
    expect(getSelect(mockLabel)).toBeInTheDocument();
  });

  it('applies default data-size correctly', () => {
    renderStudioSelect();
    expect(getSelect(mockLabel)).toHaveAttribute('data-size', 'sm');
    expect(getLabel(mockLabel)).toHaveAttribute('data-size', 'sm');
  });

  it('applies custom data-size correctly', () => {
    renderStudioSelect({ 'data-size': 'lg' });
    expect(getSelect(mockLabel).getAttribute('data-size')).toBe('lg');
    expect(getLabel(mockLabel).getAttribute('data-size')).toBe('lg');
  });

  it('renders the options correctly', () => {
    renderStudioSelect();
    expect(getOption(mockOption1Text)).toBeInTheDocument();
    expect(getOption(mockOption2Text)).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    renderStudioSelect();
    const select = getSelect(mockLabel);
    await userEvent.selectOptions(select, mockOption2Value);
    expect(select.value).toBe(mockOption2Value);
  });
});

const mockOption1Value: string = '1';
const mockOption1Text: string = 'Option 1';
const mockOption2Value: string = '2';
const mockOption2Text: string = 'Option 2';
const mockLabel: string = 'Test Label';

const defaultProps: StudioSelectProps = {
  label: mockLabel,
};

const renderStudioSelect = (props: Partial<StudioSelectProps> = {}): RenderResult => {
  return render(
    <StudioSelect {...defaultProps} {...props}>
      <StudioSelect.Option value={mockOption1Value}>{mockOption1Text}</StudioSelect.Option>
      <StudioSelect.Option value={mockOption2Value}>{mockOption2Text}</StudioSelect.Option>
    </StudioSelect>,
  );
};

const getLabel = (name: string): HTMLLabelElement => screen.getByLabelText(name);
const getSelect = (name: string): HTMLSelectElement => screen.getByRole('combobox', { name });
const getOption = (name: string): HTMLOptionElement => screen.getByRole('option', { name });
