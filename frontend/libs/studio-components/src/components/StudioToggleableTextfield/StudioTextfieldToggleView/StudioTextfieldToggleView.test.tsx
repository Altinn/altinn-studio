import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView';
import userEvent from '@testing-library/user-event';
import { KeyVerticalIcon } from '@studio/icons';

describe('StudioTextfieldToggleView', () => {
  it('should render button text', () => {
    renderStudioTextfieldToggleView();
    expect(screen.getByRole('button', { name: value })).toBeInTheDocument();
  });

  it('should execute the "onClick" method when button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioTextfieldToggleView();
    await user.click(screen.getByRole('button', { name: value }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render the both given Icon and pencilIcon', () => {
    renderStudioTextfieldToggleView();
    expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(2);
  });

  it('should forward the rest of the props to the button', () => {
    renderStudioTextfieldToggleView({ disabled: true });
    expect(screen.getByRole('button', { name: value })).toBeDisabled();
  });

  it('should show label if defined', () => {
    renderStudioTextfieldToggleView();
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

const value = 'value';
const label = 'label';
const onClick = jest.fn();
const defaultProps: StudioTextfieldToggleViewProps = {
  value,
  label,
  onClick,
  Icon: KeyVerticalIcon,
};

const renderStudioTextfieldToggleView = (props: Partial<StudioTextfieldToggleViewProps> = {}) => {
  return render(<StudioTextfieldToggleView {...defaultProps} {...props} />);
};
