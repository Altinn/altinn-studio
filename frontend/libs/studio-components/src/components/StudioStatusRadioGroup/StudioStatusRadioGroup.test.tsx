import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioStatusRadioGroup, type StudioStatusRadioGroupProps } from './StudioStatusRadioGroup';

const mockTitle1: string = 'Success';
const mockTitle2: string = 'Info';
const mockTitle3: string = 'Warning';

const mockText1: string = 'Success text';
const mockText2: string = 'Info text';
const mockText3: string = 'Warning text';

const mockValue1: string = 'success';
const mockValue2: string = 'info';
const mockValue3: string = 'warning';

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
const mockOption3: StudioStatusRadioGroupProps['options'][number] = {
  title: mockTitle3,
  text: mockText3,
  color: 'warning',
  value: mockValue3,
};

const mockOptions: StudioStatusRadioGroupProps['options'] = [mockOption1, mockOption2, mockOption3];
const mockGroupTitle: string = 'Status group';
const mockOnChange = jest.fn();

const defaultProps: StudioStatusRadioGroupProps = {
  options: mockOptions,
  title: mockGroupTitle,
  onChange: mockOnChange,
};

describe('StudioStatusRadioGroup', () => {
  it('renders radio buttons with titles and descriptions', () => {
    renderStudioStatusRadioGroup();

    expect(screen.getByText(mockGroupTitle)).toBeInTheDocument();
    expect(screen.getByText(mockTitle1)).toBeInTheDocument();
    expect(screen.getByText(mockText1)).toBeInTheDocument();
    expect(screen.getByText(mockTitle2)).toBeInTheDocument();
    expect(screen.getByText(mockText2)).toBeInTheDocument();
    expect(screen.getByText(mockTitle3)).toBeInTheDocument();
    expect(screen.getByText(mockText3)).toBeInTheDocument();
  });

  it('allows selecting a radio button', async () => {
    const user = userEvent.setup();
    renderStudioStatusRadioGroup();

    const successRadioButton = screen.getByRole('radio', { name: `${mockTitle1} ${mockText1}` }); // Any way to do it without having both title and text?
    const infoRadioButton = screen.getByRole('radio', { name: `${mockTitle2} ${mockText2}` });
    const warningRadioButton = screen.getByRole('radio', { name: `${mockTitle3} ${mockText3}` });

    // Initially, no button should be selected
    expect(successRadioButton).not.toBeChecked();
    expect(infoRadioButton).not.toBeChecked();
    expect(warningRadioButton).not.toBeChecked();

    await user.click(infoRadioButton);

    expect(infoRadioButton).toBeChecked();
    expect(successRadioButton).not.toBeChecked();
    expect(warningRadioButton).not.toBeChecked();
  });

  it('calls onChange with correct value when a radio button is selected', async () => {
    const user = userEvent.setup();
    renderStudioStatusRadioGroup();

    const infoRadioButton = screen.getByRole('radio', { name: `${mockTitle2} ${mockText2}` });
    await user.click(infoRadioButton);

    expect(mockOnChange).toHaveBeenCalledWith(mockValue2);
    expect(mockOnChange).toHaveBeenCalledTimes(2); // Why is this being called twice?
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
