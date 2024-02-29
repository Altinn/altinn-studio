import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView';
import userEvent from '@testing-library/user-event';

describe('StudioTextfieldToggleView', () => {
  it('should render button text', () => {
    renderStudioTextfieldToggleView({ children: 'My awesome button' });
    expect(screen.getByRole('button', { name: 'My awesome button' })).toBeInTheDocument();
  });

  it('should execute the "onClick" method when button is clicked', async () => {
    const user = userEvent.setup();
    const onClickMock = jest.fn();

    renderStudioTextfieldToggleView({ children: 'My awesome button text', onClick: onClickMock });

    await act(() => user.click(screen.getByRole('button', { name: 'My awesome button text' })));
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('should render the KeyVerticalIcon', () => {
    renderStudioTextfieldToggleView({ children: 'My awesome button text' });

    // Uses testId to find the KeyVerticalIcon, since it's not available for screen reader.
    expect(screen.getByTestId('keyIcon')).toBeInTheDocument();
  });

  it('should render the PencilIcon', () => {
    renderStudioTextfieldToggleView({ children: 'My awesome button text' });

    // Uses testId to find the EditIcon, since it's not available for screen reader.
    expect(screen.getByTestId('editIcon')).toBeInTheDocument();
  });

  it('should forward the rest of the props to the button', () => {
    renderStudioTextfieldToggleView({ children: 'My awesome button text', disabled: true });
    expect(screen.getByRole('button', { name: 'My awesome button text' })).toBeDisabled();
  });
});

const renderStudioTextfieldToggleView = (props: Partial<StudioTextfieldToggleViewProps>) => {
  return render(<StudioTextfieldToggleView {...props} />);
};
