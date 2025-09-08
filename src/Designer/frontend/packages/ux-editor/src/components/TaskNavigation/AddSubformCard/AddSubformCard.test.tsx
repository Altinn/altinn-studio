import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../testing/mocks';
import { AddSubformCard, type AddSubformCardProps } from './AddSubformCard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('AddSubformCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render AddSubformCard', () => {
    renderAddSubformCard();
    expect(screen.getByText(addNewSubformText)).toBeInTheDocument();
  });

  it('should call setIsCreateSubformMode when clicked', async () => {
    const user = userEvent.setup();
    const setIsCreateSubformModeMock = jest.fn();
    renderAddSubformCard({ setIsCreateSubformMode: setIsCreateSubformModeMock });

    const addNewSubformLabel = screen.getByText(addNewSubformText);
    await user.click(addNewSubformLabel);
    expect(setIsCreateSubformModeMock).toHaveBeenCalledWith(true);
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
