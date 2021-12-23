import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import axios from 'axios';
import { createStore } from 'redux';
import { IRuntimeState } from '../../../src/types';
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';
import Entrypoint from '../../../src/features/entrypoint/Entrypoint';
import { IApplicationMetadata } from '../../../src/shared/resources/applicationMetadata';

jest.mock('axios');

describe('features > entrypoint > Entrypoint.tsx', () => {
  let mockInitialState: IRuntimeState;
  let mockStore: any;
  let mockReducer: any;

  beforeEach(() => {
    mockInitialState = getInitialStateMock({});
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        valid: true,
        validParties: [],
        message: '',
      },
    });
    mockReducer = (state: IRuntimeState, action: string): IRuntimeState => {
      if (action === 'queue/startInitialStatelessQueue') {
        return {
          ...state,
          isLoading: {
            stateless: false,
            dataTask: null,
          },
        };
      }
      return state;
    };
    mockStore = createStore(mockReducer, mockInitialState);
  });

  it('should show invalid party error if user has no valid parties', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        valid: false,
        validParties: [],
        message: '',
      },
    });
    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>,
    );
    await waitFor(() => {
      // validate party
      expect(axios.post).toBeCalled();
    });

    const invalidPartyText = await rendered.findByText('For å starte denne tjenesten må du ha tilganger som knytter deg til en privatperson.');
    expect(invalidPartyText).not.toBeNull();
  });

  it('should show loader while fetching data then start instantiation by default ', async () => {
    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>,
    );

    const contentLoader = await rendered.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    const instantiationText = await rendered.findByText('Hold deg fast, nå starter vi!');
    expect(instantiationText).not.toBeNull();
  });

  it('should show loader while fetching data then start statelessQueue if stateless app', async () => {
    const statelessApplication: IApplicationMetadata = {
      ...mockInitialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'stateless',
      },
    };
    const mockStateWithStatelessApplication: IRuntimeState = {
      ...mockInitialState,
    };
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata = statelessApplication;
    mockStore = createStore(mockReducer, mockStateWithStatelessApplication);
    mockStore.dispatch = jest.fn();

    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>,
    );

    const contentLoader = await rendered.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    // should have started the initialStatelessQueue
    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith({ type: 'queue/startInitialStatelessQueue' });
    });
  });

  it('should fetch active instances and display InstanceSelection.tsx if select-instance is configured', async () => {
    const application: IApplicationMetadata = {
      ...mockInitialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'select-instance',
      },
    };
    const mockStateWithStatelessApplication: IRuntimeState = {
      ...mockInitialState,
    };
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata = application;
    mockStore = createStore(mockReducer, mockStateWithStatelessApplication);
    mockStore.dispatch = jest.fn();
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        valid: true,
        validParties: [],
        message: '',
      },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'some-id-1', lastChanged: '28-01-1992', lastChangedBy: 'Navn Navnesen',
        },
        {
          id: 'some-id-2', lastChanged: '06-03-1974', lastChangedBy: 'Test Testesen',
        }],
    });

    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>,
    );

    await waitFor(() => {
      // validate party and fetch active instances
      expect(axios.post).toBeCalled();
      expect(axios.get).toBeCalled();
    });

    const selectInstnaceText = await rendered.findByText('Du har allerede startet å fylle ut dette skjemaet.');
    expect(selectInstnaceText).not.toBeNull();
  });

  it('should display MissingRolesError if getFormData has returned 403', () => {
    const mockState: IRuntimeState = {
      formData: {
        error: new Error('403'),
      },
      ...mockInitialState,
    }
    mockStore = createStore(mockReducer, mockState);
    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>,
    );
    const missingRolesText = rendered.findByText('Du mangler rettigheter for å se denne tjenesten.');
    expect(missingRolesText).not.toBeNull();
  })
});
