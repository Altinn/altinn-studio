import type { RefObject } from 'react';
import React, { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StudioDeleteButton } from './StudioDeleteButton';
import type { StudioDeleteButtonProps } from './StudioDeleteButton';
import userEvent from '@testing-library/user-event';
import { StudioButton } from '../StudioButton';

describe('StudioDeleteButton', () => {
  afterEach(jest.clearAllMocks);

  it('Renders the button', () => {
    renderDeleteButton();
    expect(getDeleteButton()).toBeInTheDocument();
  });

  it('Calls the onDelete callback when the user clicks the button and confirms', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderDeleteButton();
    user.click(getDeleteButton());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it('Does not call the onDelete callback when the user clicks the button and cancels', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    renderDeleteButton();
    user.click(getDeleteButton());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(0));
  });

  it('Calls the onDelete callback when the user clicks the button and confirms', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderDeleteButton();
    user.click(getDeleteButton());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it('Calls the onDelete callback directly when no confirm message is set', async () => {
    const user = userEvent.setup();
    renderDeleteButton();
    user.click(getDeleteButton());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it('Calls the onClick callback when the user clicks, regardless of confirmation', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    const onClick = jest.fn();
    renderDeleteButton({ onClick });
    user.click(getDeleteButton());
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it('Forwards the ref object to the button element if given', () => {
    const ref = createRef<HTMLButtonElement>();
    renderDeleteButton({}, ref);
    expect(ref.current).toBe(getDeleteButton());
  });

  it('Supports polymorphism', () => {
    render(
      <StudioButton as='a' href='/'>
        {buttonLabel}
      </StudioButton>,
    );
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  const getDeleteButton = () => screen.getByRole('button', { name: buttonLabel });
});

const confirmMessage = 'Er du sikker på at du vil slette dette?';
const onDelete = jest.fn();
const buttonLabel = 'Slett';
const defaultProps: StudioDeleteButtonProps = {
  children: buttonLabel,
  confirmMessage,
  onDelete,
};
const renderDeleteButton = (
  props: Partial<StudioDeleteButtonProps> = {},
  ref?: RefObject<HTMLButtonElement>,
) => render(<StudioDeleteButton {...defaultProps} {...props} ref={ref} />);
