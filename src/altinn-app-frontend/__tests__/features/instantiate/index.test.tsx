/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react'
import configureStore from 'redux-mock-store';
import Instantiate from '../../../src/features/instantiate/containers/index';
import { IRuntimeState } from '../../../src/types';
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';
import InstantiationActions from '../../../src/features/instantiate/instantiation/actions';
import { BrowserRouter } from 'react-router-dom';

describe('>>> features/instantiate/index.ts', () => {
  let mockInitialState: IRuntimeState;
  let mockStore: any;
  const createStore = configureStore();

  beforeAll(() => {
    mockInitialState = getInitialStateMock({});
    mockStore = createStore(mockInitialState);
    mockStore.dispatch = jest.fn();
    InstantiationActions.instantiate = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('+++ should show content loader on initial render and start instantiation if valid party', async () => {
    const rendered = render(
      <BrowserRouter>
        <Provider store={mockStore}>
          <Instantiate />
        </Provider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      // start instantiation
      expect(InstantiationActions.instantiate).toHaveBeenCalledTimes(1);
    });

    const contentLoader = await rendered.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    const instantiationText = await rendered.findByText('Hold deg fast, nå starter vi!');
    expect(instantiationText).not.toBeNull();

  });
});


