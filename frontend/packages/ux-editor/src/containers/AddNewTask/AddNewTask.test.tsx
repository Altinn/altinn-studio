import React from 'react';
import { AddNewTask } from './AddNewTask';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { RoutePaths } from 'app-development/enums/RoutePaths';

describe('AddNewTask', () => {
  it('Should render the card with the correct title', () => {
    renderAddNewTask();
    expect(screen.getByText(textMock('ux_editor.task_card_add_new_task'))).toBeInTheDocument();
  });

  it('Should redirect to the process editor when clicking the card', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);

    renderAddNewTask();
    await user.click(screen.getByText(textMock('ux_editor.task_card_add_new_task')));
    expect(navigate).toHaveBeenCalledWith('../' + RoutePaths.ProcessEditor);
  });
});

const renderAddNewTask = () => {
  return renderWithProviders({}, undefined, {})(<AddNewTask />);
};
