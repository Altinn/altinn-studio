import React, { type Ref } from 'react';
import { StudioFormActions, type StudioFormActionsProps } from './StudioFormActions';
import { render, type RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const defaultProps: StudioFormActionsProps = {
  primaryText: 'Save',
  secondaryText: 'Cancel',
  onPrimaryAction: jest.fn(),
  onSecondaryAction: jest.fn(),
  isLoading: false,
  disabled: false,
};

describe('StudioFormActions', () => {
  it('should render primary and secondary buttons with correct text', () => {
    renderStudioFormActions();

    const saveButton = screen.getByRole('button', { name: 'Save' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call the correct handlers when buttons are clicked', async () => {
    const user = userEvent.setup();
    const onPrimaryAction = jest.fn();
    const onSecondaryAction = jest.fn();
    renderStudioFormActions({ onPrimaryAction, onSecondaryAction });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(saveButton);
    await user.click(cancelButton);

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when isLoading or disabled props are true', () => {
    renderStudioFormActions({ isLoading: true, disabled: true });
    const saveButton = screen.getByRole('button', { name: 'Save' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should forward ref to the container div', () => {
    const ref = React.createRef<HTMLDivElement>();
    renderStudioFormActions({}, ref);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should show loading spinner in primary button when isLoading is true', () => {
    renderStudioFormActions({ isLoading: true, spinnerAriaLabel: 'loading' });
    const spinner = screen.getByTestId('studio-spinner-test-id');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'loading');
  });
});

const renderStudioFormActions = (
  props?: Partial<StudioFormActionsProps>,
  ref?: Ref<HTMLDivElement>,
): RenderResult => {
  const mergedProps = { ...defaultProps, ...props };
  return render(<StudioFormActions {...mergedProps} ref={ref} />);
};
