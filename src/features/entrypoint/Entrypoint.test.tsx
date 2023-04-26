import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { createStore } from 'redux';
import type { AxiosError } from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { renderWithProviders } from 'src/testUtils';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IRuntimeState } from 'src/types';
import type { IApplicationLogic } from 'src/types/shared';

describe('Entrypoint', () => {
  let mockInitialState: IRuntimeState;
  let mockStore: any;
  let mockReducer: any;

  beforeEach(() => {
    mockInitialState = getInitialStateMock({});
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

  test('should show invalid party error if user has no valid parties', async () => {
    const doPartyValidation = () => Promise.resolve({ data: { valid: false, validParties: [], message: '' } });
    const queries = {
      doPartyValidation,
    };
    render({ store: mockStore, queries });

    await waitForElementToBeRemoved(screen.queryByText('Vent litt, vi henter det du trenger'));

    const invalidPartyText = await screen.findByText(
      'For å starte denne tjenesten må du ha tilganger som knytter deg til en privatperson.',
    );
    expect(invalidPartyText).not.toBeNull();
  });

  test('should show loader while fetching data then start instantiation by default ', async () => {
    render({ store: mockStore });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    const instantiationText = await screen.findByText('Vent litt, vi henter det du trenger');
    expect(instantiationText).not.toBeNull();
  });

  test('should show loader while fetching data then start statelessQueue if stateless app', async () => {
    const doPartyValidation = () => Promise.resolve({ data: { valid: true, validParties: [], message: '' } });
    const queries = {
      doPartyValidation,
    };
    const statelessApplication: IApplicationMetadata = {
      ...(mockInitialState.applicationMetadata.applicationMetadata as IApplicationMetadata),
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

    render({ store: mockStore, queries, allowAnonymous: false });
    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    // should have started the initialStatelessQueue
    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'queue/startInitialStatelessQueue',
      });
    });
  });

  test('should show loader while fetching data then start statelessQueue if stateless app with allowAnonymous', async () => {
    const statelessApplication: IApplicationMetadata = {
      ...(mockInitialState.applicationMetadata.applicationMetadata as IApplicationMetadata),
      onEntry: {
        show: 'stateless',
      },
    };
    (statelessApplication.dataTypes[0].appLogic as IApplicationLogic).allowAnonymousOnStateless = true;
    const mockStateWithStatelessApplication: IRuntimeState = {
      ...mockInitialState,
    };
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata = statelessApplication;
    mockStore = createStore(mockReducer, mockStateWithStatelessApplication);
    mockStore.dispatch = jest.fn();

    render({ store: mockStore, allowAnonymous: true });

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    // should have started the initialStatelessQueue
    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: 'queue/startInitialStatelessQueue',
      });
    });
  });

  test('should fetch active instances and display InstanceSelection.tsx if select-instance is configured', async () => {
    const application: IApplicationMetadata = {
      ...(mockInitialState.applicationMetadata.applicationMetadata as IApplicationMetadata),
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

    const doPartyValidation = () => Promise.resolve({ data: { valid: true, validParties: [], message: '' } });

    const queries = {
      doPartyValidation,
      fetchActiveInstances: () =>
        Promise.resolve([
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
        ]),
    };
    render({ store: mockStore, queries });

    await waitFor(async () => {
      const selectInstanceText = await screen.findByText('Du har allerede startet å fylle ut dette skjemaet.');
      expect(selectInstanceText).not.toBeNull();
    });
  });

  test('should display MissingRolesError if getFormData has returned 403', async () => {
    const mockState: IRuntimeState = {
      ...mockInitialState,
      formData: {
        ...mockInitialState.formData,
        error: { config: {}, response: { status: 403 } } as AxiosError,
      },
    };
    mockStore = createStore(mockReducer, mockState);
    render({ store: mockStore });

    const missingRolesText = await screen.findByText('Du mangler rettigheter for å se denne tjenesten.');
    expect(missingRolesText).not.toBeNull();
  });

  function render({ store, allowAnonymous = false, queries }: { store: any; allowAnonymous?: boolean; queries?: any }) {
    return renderWithProviders(
      <MemoryRouter>
        <Entrypoint allowAnonymous={allowAnonymous} />
      </MemoryRouter>,
      { store },
      queries,
    );
  }
});
