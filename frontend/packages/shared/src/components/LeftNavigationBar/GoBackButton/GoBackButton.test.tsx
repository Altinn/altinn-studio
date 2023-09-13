import React from 'react';
import { render, screen } from '@testing-library/react';
import { GoBackButton, GoBackButtonProps } from './GoBackButton';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

const mockBackButtonText: string = 'Go back';

describe('GoBackButton', () => {
  afterEach(jest.clearAllMocks);

  const mockOnClickBackButton = jest.fn();

  const defaultProps: GoBackButtonProps = {
    className: '.navigationElement',
    onClick: mockOnClickBackButton,
    text: mockBackButtonText,
  };

  it('calls the "onClickBackButton" function when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<GoBackButton {...defaultProps} />);

    const backButton = screen.getByRole('button', { name: mockBackButtonText });
    await act(() => user.click(backButton));
    expect(mockOnClickBackButton).toHaveBeenCalledTimes(1);
  });
});
