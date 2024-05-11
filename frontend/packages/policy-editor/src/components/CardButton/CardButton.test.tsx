import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { CardButtonProps } from './CardButton';
import { CardButton } from './CardButton';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockButtonText = textMock('policy_editor.card_button_text');

describe('CardButton', () => {
  afterEach(jest.clearAllMocks);

  const mockOnClick = jest.fn();

  const defaultProps: CardButtonProps = {
    buttonText: mockButtonText,
    onClick: mockOnClick,
  };

  it('calls the onClick function when clicked', async () => {
    const user = userEvent.setup();
    render(<CardButton {...defaultProps} />);

    const buttonElement = screen.getByRole('button', { name: mockButtonText });
    user.click(buttonElement);

    await waitFor(() => expect(mockOnClick).toHaveBeenCalledTimes(1));
  });
});
