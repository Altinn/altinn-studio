import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route } from 'react-router-dom';

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import {
  render as renderRtl,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import configureStore from 'redux-mock-store';

import Instantiate from 'src/features/instantiate/containers';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { HttpStatusCodes } from 'src/utils/networking';
import type { IRuntimeState } from 'src/types';

import { getInitialStateMock } from 'altinn-app-frontend/__mocks__/initialStateMock';

import { AltinnAppTheme } from 'altinn-shared/theme';

const render = (initialState: Partial<IRuntimeState> = {}) => {
  const theme = createTheme(AltinnAppTheme);
  const createStore = configureStore();
  const mockInitialState = getInitialStateMock(initialState);
  const mockStore = createStore(mockInitialState);
  mockStore.dispatch = jest.fn();

  renderRtl(
    <MuiThemeProvider theme={theme}>
      <BrowserRouter>
        <Provider store={mockStore}>
          <Instantiate />
        </Provider>
        <Route path='/instance/1'>Instance page</Route>
      </BrowserRouter>
    </MuiThemeProvider>,
  );

  return mockStore.dispatch;
};

describe('features/instantiate/index', () => {
  it('should show content loader on initial render and start instantiation if valid party', async () => {
    const mockDispatch = render();

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        InstantiationActions.instantiate(),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).toBeInTheDocument();

    const instantiationText = within(
      await screen.findByTestId('presentation-heading'),
    ).getByText('Hold deg fast, nå starter vi!');

    expect(instantiationText).toBeInTheDocument();
    expect(screen.queryByText('Instance page')).not.toBeInTheDocument();
  });

  it('should show header as "" when translations have not been initialized properly loader on initial render and start instantiation if valid party', async () => {
    const mockDispatch = render({
      language: {
        language: {
          instantiate: {
            starting: 'instantiate.starting',
          },
        },
        selectedAppLanguage: '',
        error: null,
      },
    });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        InstantiationActions.instantiate(),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).toBeInTheDocument();

    const instantiationText = within(
      await screen.findByTestId('presentation-heading'),
    ).getByText('');

    expect(instantiationText).toBeInTheDocument();
  });

  it('should not call InstantiationActions.instantiate when no selected party', async () => {
    const mockDispatch = render({
      party: {
        parties: [],
        error: null,
        selectedParty: null,
      },
    });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(0);
    });
  });

  it('should redirect when instanceId is set', () => {
    render({
      instantiation: {
        error: null,
        instanceId: '1',
        instantiating: null,
      },
    });

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Hold deg fast, nå starter vi!'),
    ).not.toBeInTheDocument();

    expect(screen.getByText('Instance page')).toBeInTheDocument();
  });

  it('should show unknown error for generic errors', async () => {
    const error = {
      message: 'instantiation error',
      name: 'instantiation error',
      config: {},
      isAxiosError: true,
      response: {
        data: {},
      },
    };

    render({
      instantiation: {
        error,
        instanceId: null,
        instantiating: null,
      },
    });

    expect(screen.getAllByText('Ukjent feil')[0]).toBeInTheDocument();
  });

  it('should show missing access when http status is forbidden', async () => {
    const error = {
      message: 'instantiation error',
      name: 'instantiation error',
      config: {},
      isAxiosError: true,
      response: {
        status: HttpStatusCodes.Forbidden,
      },
    };

    render({
      instantiation: {
        error,
        instanceId: null,
        instantiating: null,
      },
    });

    expect(screen.getByText('Feil 403')).toBeInTheDocument();
    expect(
      screen.getByText('Du mangler rettigheter for å se denne tjenesten.'),
    ).toBeInTheDocument();
  });

  it('should show instantiation error page when axios error contains a message', async () => {
    const error = {
      message: 'instantiation error',
      name: 'instantiation error',
      config: {},
      isAxiosError: true,
      response: {
        status: HttpStatusCodes.Forbidden,
        data: {
          message: 'axios error',
        },
      },
    };

    render({
      instantiation: {
        error,
        instanceId: null,
        instantiating: null,
      },
    });

    expect(screen.getByText('Feil 403')).toBeInTheDocument();
    expect(screen.getByText('axios error')).toBeInTheDocument();
  });
});
