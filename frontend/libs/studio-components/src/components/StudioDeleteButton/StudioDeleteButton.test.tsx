import type { Ref } from 'react';
import React from 'react';
import { render, RenderResult, screen } from '@testing-library/react';
import { StudioDeleteButton } from './StudioDeleteButton';
import type { StudioDeleteButtonProps } from './StudioDeleteButton';
import userEvent from '@testing-library/user-event';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

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
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Does not call the onDelete callback when the user clicks the button and cancels', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    renderDeleteButton();
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(0);
  });

  it('Calls the onDelete callback when the user clicks the button and confirms', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderDeleteButton();
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Calls the onDelete callback directly when no confirm message is set', async () => {
    const user = userEvent.setup();
    renderDeleteButton();
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Calls the onClick callback when the user clicks, regardless of confirmation', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    const onClick = jest.fn();
    renderDeleteButton({ onClick });
    await user.click(getDeleteButton());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Forwards the ref object to the button element if given', () => {
    testRefForwarding<HTMLButtonElement>((ref) => renderDeleteButton({}, ref), getDeleteButton);
  });

  const getDeleteButton = (): HTMLButtonElement =>
    screen.getByRole('button', { name: buttonLabel });
});

const confirmMessage: string = 'Er du sikker på at du vil slette dette?';
const onDelete = jest.fn();
const buttonLabel: string = 'Slett';
const defaultProps: StudioDeleteButtonProps = {
  children: buttonLabel,
  confirmMessage,
  onDelete,
};
const renderDeleteButton = (
  props: Partial<StudioDeleteButtonProps> = {},
  ref?: Ref<HTMLButtonElement>,
): RenderResult => render(<StudioDeleteButton {...defaultProps} {...props} ref={ref} />);
