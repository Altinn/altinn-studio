import React from 'react';
import { render, screen } from '@testing-library/react';
import { CardButton, CardButtonProps } from './CardButton';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const mockButtonText = textMock('policy_editor.card_button_text');

describe('CardButton', () => {
  const mockOnClick = jest.fn();

  const defaultProps: CardButtonProps = {
    buttonText: mockButtonText,
    onClick: mockOnClick,
  };

  it('calls the onClick function when clicked', async () => {
    const user = userEvent.setup();
    render(<CardButton {...defaultProps} />);

    const buttonElement = screen.getByRole('button', { name: mockButtonText });
    await act(() => user.click(buttonElement));

    expect(mockOnClick).toHaveBeenCalled();
  });
});
