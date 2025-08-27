import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../testing/mocks';
import { AddSubformCard, type AddSubformCardProps } from './AddSubformCard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('AddSubformCard', () => {
  it('should render AddSubformCard', () => {
    renderAddSubformCard();
    expect(screen.getByText(addNewSubformText)).toBeInTheDocument();
  });

  it('should handle keyboard interactions', async () => {
    const user = userEvent.setup();
    const setIsCreateSubformMode = jest.fn();
    renderAddSubformCard({ setIsCreateSubformMode });
    const addSubformCard = screen.getByRole('button');
    expect(addSubformCard).toBeInTheDocument();
    addSubformCard.focus();

    await user.keyboard('{Enter}');
    expect(setIsCreateSubformMode).toHaveBeenCalledTimes(1);
    expect(addSubformCard).toHaveAttribute('tabIndex', '0');
    expect(addSubformCard).toHaveAttribute('role', 'button');

    setIsCreateSubformMode.mockClear();

    addSubformCard.focus();
    await user.keyboard(' ');
    expect(setIsCreateSubformMode).toHaveBeenCalledTimes(1);
    expect(addSubformCard).toHaveAttribute('tabIndex', '0');
    expect(addSubformCard).toHaveAttribute('role', 'button');
  });

  it('should render CreateSubformMode when isSubformInEditMode is true', () => {
    renderAddSubformCard({ isSubformInEditMode: true });
    expect(screen.queryByText(addNewSubformText)).not.toBeInTheDocument();
    expect(screen.getByText(subformTitle)).toBeInTheDocument();
  });
});

const addNewSubformText = textMock('ux_editor.task_card_add_new_subform');
const subformTitle = textMock('ux_editor.subform');

const defaultProps: AddSubformCardProps = {
  isSubformInEditMode: false,
  setIsCreateSubformMode: jest.fn(),
};

const renderAddSubformCard = (props?: Partial<AddSubformCardProps>) => {
  return renderWithProviders(<AddSubformCard {...defaultProps} {...props} />);
};
