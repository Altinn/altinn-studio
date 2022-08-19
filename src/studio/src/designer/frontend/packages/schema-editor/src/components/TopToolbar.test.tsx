import React from 'react';
import { act } from 'react-dom/test-utils';
import TopToolbar from './TopToolbar';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderToolbar = (Toolbar: JSX.Element = <></>) => {
  const saveAction = jest.fn();
  const user = userEvent.setup();
  act(() => {
    render(
      <TopToolbar Toolbar={Toolbar} language={{}} saveAction={saveAction} />,
    );
  });
  return { saveAction, user };
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
  const saveButton = screen.getByRole('button');
  expect(saveButton).toBeDefined();
  await user.click(saveButton);
  expect(saveAction).toBeCalledTimes(1);
});
