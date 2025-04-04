import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/mocks';
import { AddSubformCard, type AddSubformCardProps } from './AddSubformCard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('AddSubformCard', () => {
  it('should render AddSubformCard', () => {
    renderAddSubformCard();
    expect(screen.getByText(textMock('ux_editor.task_card_add_new_subform'))).toBeInTheDocument();
  });

  it('should handle keyboard interactions', async () => {
    const user = userEvent.setup();
    const mockHandleAddSubform = jest.fn();
    renderAddSubformCard({ onAddSubform: mockHandleAddSubform });
    const addSubformCard = screen.getByRole('button');
    expect(addSubformCard).toBeInTheDocument();
    addSubformCard.focus();

    await user.keyboard('{Enter}');
    expect(mockHandleAddSubform).toHaveBeenCalledTimes(1);
    expect(addSubformCard).toHaveAttribute('tabIndex', '0');
    expect(addSubformCard).toHaveAttribute('role', 'button');

    mockHandleAddSubform.mockClear();

    addSubformCard.focus();
    await user.keyboard(' ');
    expect(mockHandleAddSubform).toHaveBeenCalledTimes(1);
    expect(addSubformCard).toHaveAttribute('tabIndex', '0');
    expect(addSubformCard).toHaveAttribute('role', 'button');
  });
});

const view = renderWithProviders();
const renderAddSubformCard = (props: AddSubformCardProps = {}) => {
  return view(<AddSubformCard {...props} />);
};
