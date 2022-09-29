import React from 'react';
import { act } from 'react-dom/test-utils';
import { TopToolbar } from './TopToolbar';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderToolbar = (Toolbar: JSX.Element = <></>) => {
  const saveAction = jest.fn();
  const toggleEditMode = jest.fn();
  const user = userEvent.setup();
  act(() => {
    render(
      <TopToolbar
        Toolbar={Toolbar}
        language={{}}
        saveAction={saveAction}
        editMode={true}
        toggleEditMode={toggleEditMode}
      />,
    );
  });
  return { saveAction, toggleEditMode, user };
};

test('renders the top toolbar', () => {
  renderToolbar();
  const topToolbar = screen.getByRole('toolbar');
  expect(topToolbar).toBeDefined();
});

test('handles a click on the save button', async () => {
  const { saveAction, user } = renderToolbar(<></>);
  const topToolbar = screen.getByRole('toolbar');
  expect(topToolbar).toBeDefined();
  const saveButton = screen.getByRole('button', {
    name: 'save_data_model',
  });
  expect(saveButton).toBeDefined();
  await user.click(saveButton);
  expect(saveAction).toBeCalledTimes(1);
});

test('handles a click on the toggle edit mode button', async () => {
  const { toggleEditMode, user } = renderToolbar(<></>);
  const topToolbar = screen.getByRole('toolbar');
  expect(topToolbar).toBeDefined();
  const toggleEditModeButton = screen.getByText('edit_mode');
  expect(toggleEditModeButton).toBeDefined();
  await user.click(toggleEditModeButton);
  expect(toggleEditMode).toBeCalledTimes(1);
});
