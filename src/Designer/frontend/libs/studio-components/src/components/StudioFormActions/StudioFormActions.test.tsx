import React, { type Ref } from 'react';
import { StudioFormActions, type StudioFormActionsProps } from './StudioFormActions';
import { render, type RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const defaultProps: StudioFormActionsProps = {
  primary: {
    label: 'Save',
    onClick: () => {},
  },
  secondary: {
    label: 'Cancel',
    onClick: () => {},
  },
  isLoading: false,
};

describe('StudioFormActions', () => {
  const getButtons = (): { saveButton: HTMLElement; cancelButton: HTMLElement } => {
    const saveButton = screen.getByRole('button', { name: 'Save' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    return { saveButton, cancelButton };
  };

  it('should render primary and secondary buttons with correct text', () => {
    renderStudioFormActions();
    const { saveButton, cancelButton } = getButtons();
    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call the correct handlers when buttons are clicked', async () => {
    const user = userEvent.setup();
    const onPrimaryAction = jest.fn();
    const onSecondaryAction = jest.fn();
    renderStudioFormActions({
      primary: { label: 'Save', onClick: onPrimaryAction },
      secondary: { label: 'Cancel', onClick: onSecondaryAction },
    });

    const { saveButton, cancelButton } = getButtons();
    await user.click(saveButton);
    await user.click(cancelButton);

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });

  it('should disable both buttons when isLoading is true', () => {
    renderStudioFormActions({ isLoading: true });
    const { saveButton, cancelButton } = getButtons();
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should disable primary button when primary.disabled is true', () => {
    renderStudioFormActions({
      primary: { label: 'Save', onClick: () => {}, disabled: true },
    });
    const { saveButton } = getButtons();
    expect(saveButton).toBeDisabled();
  });

  it('should disable secondary button when secondary.disabled is true', () => {
    renderStudioFormActions({
      secondary: { label: 'Cancel', onClick: () => {}, disabled: true },
    });
    const { cancelButton } = getButtons();
    expect(cancelButton).toBeDisabled();
  });

  it('should define aria-label when iconOnly is true and hide labels', () => {
    renderStudioFormActions({ iconOnly: true });
    const { saveButton, cancelButton } = getButtons();
    expect(saveButton).toHaveAttribute('aria-label', 'Save');
    expect(cancelButton).toHaveAttribute('aria-label', 'Cancel');
    expect(saveButton).not.toHaveTextContent('Save');
    expect(cancelButton).not.toHaveTextContent('Cancel');
  });

  it('should forward ref to the container div', () => {
    const ref = React.createRef<HTMLDivElement>();
    renderStudioFormActions({}, ref);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

const renderStudioFormActions = (
  props?: Partial<StudioFormActionsProps>,
  ref?: Ref<HTMLDivElement>,
): RenderResult => {
  const mergedProps: StudioFormActionsProps = {
    ...defaultProps,
    ...props,
    primary: { ...defaultProps.primary, ...props?.primary },
    secondary: { ...defaultProps.secondary, ...props?.secondary },
  };

  return render(<StudioFormActions {...mergedProps} ref={ref} />);
};
