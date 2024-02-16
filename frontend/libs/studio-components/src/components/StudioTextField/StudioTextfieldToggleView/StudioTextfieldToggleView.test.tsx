import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView';
import userEvent from '@testing-library/user-event';

const children = 'Test';

describe('StudioTextfieldToggleView', () => {
  it('should render the children', () => {
    renderStudioTextfieldToggleView({ children });
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should call the onClick function when StudioButton is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderStudioTextfieldToggleView({ onClick });
    await act(() => user.click(screen.getByRole('button')));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render the KeyVerticalIcon', () => {
    renderStudioTextfieldToggleView({ children });
    expect(screen.getByLabelText('keyIcon')).toBeInTheDocument();
  });

  it('should render the PencilIcon', () => {
    renderStudioTextfieldToggleView({ children });
    expect(screen.getByLabelText('EditIcon')).toBeInTheDocument();
  });
});

const renderStudioTextfieldToggleView = (props: Partial<StudioTextfieldToggleViewProps>) => {
  const defaultProps: StudioTextfieldToggleViewProps = {};
  return render(<StudioTextfieldToggleView {...defaultProps} {...props} />);
};
