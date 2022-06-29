import * as React from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { AxiosError } from 'axios';
import axios from 'axios';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';
import type { IRuntimeState } from 'src/types';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import Entrypoint from './Entrypoint';
import { renderWithProviders } from '../../../testUtils';

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
    renderWithProviders(<Entrypoint />, { store: mockStore });
    await waitFor(() => {
      // validate party
      expect(axios.post).toBeCalled();
    });

    const invalidPartyText = await screen.findByText(
      'For å starte denne tjenesten må du ha tilganger som knytter deg til en privatperson.',
    );
    expect(invalidPartyText).not.toBeNull();
  });

  it('should show loader while fetching data then start instantiation by default ', async () => {
    renderWithProviders(<Entrypoint />, { store: mockStore });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    const instantiationText = await screen.findByText(
      'Hold deg fast, nå starter vi!',
    );
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
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata =
      statelessApplication;
    mockStore = createStore(mockReducer, mockStateWithStatelessApplication);
    mockStore.dispatch = jest.fn();

    renderWithProviders(<Entrypoint />, { store: mockStore });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    // should have started the initialStatelessQueue
    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'queue/startInitialStatelessQueue',
      });
    });
  });

  it('should show loader while fetching data then start statelessQueue if stateless app with allowAnonymous', async () => {
    const statelessApplication: IApplicationMetadata = {
      ...mockInitialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'stateless',
      },
    };
    statelessApplication.dataTypes[0].appLogic.allowAnonymousOnStateless = true;
    const mockStateWithStatelessApplication: IRuntimeState = {
      ...mockInitialState,
    };
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata =
      statelessApplication;
    mockStore = createStore(mockReducer, mockStateWithStatelessApplication);
    mockStore.dispatch = jest.fn();

    renderWithProviders(<Entrypoint />, { store: mockStore });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    // should have started the initialStatelessQueue
    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'queue/startInitialStatelessQueue',
      });
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
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata =
      application;
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
          id: 'some-id-1',
          lastChanged: '28-01-1992',
          lastChangedBy: 'Navn Navnesen',
        },
        {
          id: 'some-id-2',
          lastChanged: '06-03-1974',
          lastChangedBy: 'Test Testesen',
        },
      ],
    });
    renderWithProviders(<Entrypoint />, { store: mockStore });

    await waitFor(() => {
      // validate party and fetch active instances
      expect(axios.post).toBeCalled();
      expect(axios.get).toBeCalled();
    });

    const selectInstnaceText = await screen.findByText(
      'Du har allerede startet å fylle ut dette skjemaet.',
    );
    expect(selectInstnaceText).not.toBeNull();
  });

  it('should display MissingRolesError if getFormData has returned 403', async () => {
    const mockState: IRuntimeState = {
      ...mockInitialState,
      formData: {
        ...mockInitialState.formData,
        error: { config: {}, response: { status: 403 } } as AxiosError,
      },
    };
    mockStore = createStore(mockReducer, mockState);
    renderWithProviders(
      <MemoryRouter>
        <Entrypoint />
      </MemoryRouter>,
      { store: mockStore },
    );

    const missingRolesText = await screen.findByText(
      'Du mangler rettigheter for å se denne tjenesten.',
    );
    expect(missingRolesText).not.toBeNull();
  });
});
