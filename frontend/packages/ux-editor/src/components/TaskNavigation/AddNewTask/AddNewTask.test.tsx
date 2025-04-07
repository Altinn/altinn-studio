import React from 'react';
import { AddNewTask } from './AddNewTask';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const setupNavigateSpy = () => {
  const navigate = jest.fn();
  jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
  return navigate;
};

describe('AddNewTask', () => {
  it('Should render the card with the correct title', () => {
    renderAddNewTask();
    expect(screen.getByText(textMock('ux_editor.task_card_add_new_task'))).toBeInTheDocument();
  });

  it('Should redirect to the process editor when clicking the card', async () => {
    const user = userEvent.setup();
    const navigate = setupNavigateSpy();
    renderAddNewTask();
    await user.click(screen.getByText(textMock('ux_editor.task_card_add_new_task')));
    expect(navigate).toHaveBeenCalledWith(
      '../' + RoutePaths.ProcessEditor + '?returnTo=' + RoutePaths.UIEditor,
    );
  });

  it('should redirect to the process editor when pressing Enter or Space', async () => {
    const user = userEvent.setup();
    const navigate = setupNavigateSpy();
    renderAddNewTask();

    const card = screen.getByRole('button');
    card.focus();

    const keysToTest = ['{Enter}', ' '];
    for (const key of keysToTest) {
      await user.keyboard(key);

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith(
          '../' + RoutePaths.ProcessEditor + '?returnTo=' + RoutePaths.UIEditor,
        ),
      );
    }
  });
});

const renderAddNewTask = () => {
  return renderWithProviders(<AddNewTask />);
};
