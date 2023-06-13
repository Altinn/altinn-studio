import React from 'react';
import configureStore from 'redux-mock-store';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { SchemaState } from '@altinn/schema-editor/types';

export const renderWithRedux = (element: JSX.Element, state: Partial<SchemaState> = {}) => {
  const store = configureStore()(state ?? {});
  const user = userEvent.setup();
  const renderResult = render(<Provider store={store}>{element}</Provider>);
  const rerenderWithRedux = (elementToRerender: JSX.Element, newState?: any) => {
    const newStore = configureStore()(newState ?? {});
    renderResult.rerender(<Provider store={newStore}>{elementToRerender}</Provider>);
  };
  return { store, user, renderResult, rerenderWithRedux };
};
