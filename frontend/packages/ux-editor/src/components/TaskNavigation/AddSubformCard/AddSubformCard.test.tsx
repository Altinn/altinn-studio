import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'app-development/test/mocks';
import { AddSubformCard } from './AddSubformCard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('AddSubformCard', () => {
  it('should render AddSubformCard', () => {
    renderAddSubformCard();
    expect(screen.getByText(textMock('ux_editor.task_card_add_new_subform'))).toBeInTheDocument();
  });

  it('should handle keyboard interactions', async () => {
    const user = userEvent.setup();
    renderAddSubformCard();
    const addSubformCard = screen.getByRole('button');
    expect(addSubformCard).toBeInTheDocument();
    await user.keyboard('Enter');
    expect(addSubformCard).toHaveAttribute('tabIndex', '0');
    expect(addSubformCard).toHaveAttribute('role', 'button');
    await user.keyboard(' ');
    expect(addSubformCard).toHaveAttribute('tabIndex', '0');
    expect(addSubformCard).toHaveAttribute('role', 'button');
  });
});

const view = renderWithProviders();
const renderAddSubformCard = () => {
  return view(<AddSubformCard />);
};
