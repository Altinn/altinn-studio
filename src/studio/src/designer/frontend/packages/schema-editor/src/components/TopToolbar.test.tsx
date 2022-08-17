import React from 'react';
import { act } from 'react-dom/test-utils';
import TopToolbar from './TopToolbar';
import { fireEvent, render, screen } from '@testing-library/react';

const renderToolbar = (Toolbar: JSX.Element = <></>) => {
  const saveAction = jest.fn();
  act(() => {
    render(
      <TopToolbar Toolbar={Toolbar} language={{}} saveAction={saveAction} />,
    );
  });
  return saveAction;
};

const selectTopToolbar = (wrapper: any) => {
  return wrapper.find('TopToolbar');
};

test('renders the top toolbar', () => {
  renderToolbar();
  const topToolbar = screen.getByRole('toolbar');
  expect(topToolbar).toBeDefined();
});

test('handles a click on the save button', () => {
  const clicked = renderToolbar(<></>);
  const topToolbar = screen.getByRole('toolbar');
  expect(topToolbar).toBeDefined();
  const saveButton = screen.getByRole('button');
  expect(saveButton).toBeDefined();
  fireEvent.click(saveButton);
  expect(clicked).toBeCalledTimes(1);
});
