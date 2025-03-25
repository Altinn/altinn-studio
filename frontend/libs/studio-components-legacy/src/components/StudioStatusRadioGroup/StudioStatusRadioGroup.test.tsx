import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioStatusRadioGroup, type StudioStatusRadioGroupProps } from './StudioStatusRadioGroup';

const mockTitle1: string = 'Success';
const mockTitle2: string = 'Info';

const mockText1: string = 'Success text';
const mockText2: string = 'Info text';

const mockValue1: string = 'success';
const mockValue2: string = 'info';

const mockOption1: StudioStatusRadioGroupProps['options'][number] = {
  title: mockTitle1,
  text: mockText1,
  color: 'success',
  value: mockValue1,
};
const mockOption2: StudioStatusRadioGroupProps['options'][number] = {
  title: mockTitle2,
  text: mockText2,
  color: 'info',
  value: mockValue2,
};

const mockOptions: StudioStatusRadioGroupProps['options'] = [mockOption1, mockOption2];
const mockGroupTitle: string = 'Status group';
const mockOnChange = jest.fn();

const defaultProps: StudioStatusRadioGroupProps = {
  options: mockOptions,
  title: mockGroupTitle,
  onChange: mockOnChange,
};

describe('StudioStatusRadioGroup', () => {
  beforeEach(jest.clearAllMocks);

  it('renders radio buttons with titles and descriptions', () => {
    renderStudioStatusRadioGroup();

    expect(screen.getByText(mockGroupTitle)).toBeInTheDocument();
    expect(screen.getByText(mockTitle1)).toBeInTheDocument();
    expect(screen.getByText(mockText1)).toBeInTheDocument();
    expect(screen.getByText(mockTitle2)).toBeInTheDocument();
    expect(screen.getByText(mockText2)).toBeInTheDocument();
  });

  it('allows selecting a radio button', async () => {
    const user = userEvent.setup();
    renderStudioStatusRadioGroup();

    const successRadioButton = screen.getByRole('radio', { name: `${mockTitle1} ${mockText1}` });
    const infoRadioButton = screen.getByRole('radio', { name: `${mockTitle2} ${mockText2}` });

    expect(successRadioButton).not.toBeChecked();
    expect(infoRadioButton).not.toBeChecked();

    await user.click(infoRadioButton);

    expect(infoRadioButton).toBeChecked();
    expect(successRadioButton).not.toBeChecked();
  });

  it('calls onChange with correct value when a radio button is selected', async () => {
    const user = userEvent.setup();
    renderStudioStatusRadioGroup();

    const infoRadioButton = screen.getByRole('radio', { name: `${mockTitle2} ${mockText2}` });
    await user.click(infoRadioButton);

    expect(mockOnChange).toHaveBeenCalledWith(mockValue2);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('renders with default value selected', () => {
    renderStudioStatusRadioGroup({ defaultValue: mockValue2 });

    const successRadioButton = screen.getByRole('radio', { name: `${mockTitle1} ${mockText1}` });
    const infoRadioButton = screen.getByRole('radio', { name: `${mockTitle2} ${mockText2}` });

    expect(infoRadioButton).toBeChecked();
    expect(successRadioButton).not.toBeChecked();
  });

  it('applies correct aria attributes for accessibility', () => {
    renderStudioStatusRadioGroup();

    const successRadioButton = screen.getByRole('radio', { name: `${mockTitle1} ${mockText1}` });
    const inputId = `${mockGroupTitle}-${mockValue1}`;

    expect(successRadioButton).toHaveAttribute('aria-labelledby', `${inputId}-title`);
    expect(successRadioButton).toHaveAttribute('aria-describedby', `${inputId}-text`);
  });

  it('focuses on the radio button when clicked', async () => {
    const user = userEvent.setup();
    renderStudioStatusRadioGroup();

    const infoRadioButton = screen.getByRole('radio', { name: `${mockTitle2} ${mockText2}` });
    await user.click(infoRadioButton);

    expect(infoRadioButton).toHaveFocus();
  });
});

const renderStudioStatusRadioGroup = (props: Partial<StudioStatusRadioGroupProps> = {}) => {
  return render(<StudioStatusRadioGroup {...defaultProps} {...props} />);
};
