import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import type { AxiosError } from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { renderWithProviders } from 'src/test/renderWithProviders';
import type { AppQueriesContext } from 'src/contexts/appQueriesContext';
import type { IRuntimeState } from 'src/types';

describe('Entrypoint', () => {
  const mockInitialState = getInitialStateMock();

  test('should show invalid party error if user has no valid parties', async () => {
    render({
      queries: {
        doPartyValidation: () => Promise.resolve({ valid: false, validParties: [], message: '' }),
      },
    });

    await waitForElementToBeRemoved(screen.queryByText('Vent litt, vi henter det du trenger'));

    const invalidPartyText = await screen.findByText(
      'For å starte denne tjenesten må du ha tilganger som knytter deg til en privatperson.',
    );
    expect(invalidPartyText).not.toBeNull();
  });

  test('should show loader while fetching data then start instantiation by default ', async () => {
    render();

    const contentLoader = await screen.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    const instantiationText = await screen.findByText('Vent litt, vi henter det du trenger');
    expect(instantiationText).not.toBeNull();
  });

  test('should fetch active instances and display InstanceSelection.tsx if select-instance is configured', async () => {
    render({
      onEntry: 'select-instance',
      queries: {
        doPartyValidation: () => Promise.resolve({ valid: true, validParties: [], message: '' }),
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
      },
    });

    await waitFor(async () => {
      const selectInstanceText = await screen.findByText('Du har allerede startet å fylle ut dette skjemaet.');
      expect(selectInstanceText).not.toBeNull();
    });
  });

  test('should display MissingRolesError if getFormData has returned 403', async () => {
    render({
      state: {
        formData: {
          ...mockInitialState.formData,
          error: { config: {}, response: { status: 403 } } as AxiosError,
        },
      },
    });

    const missingRolesText = await screen.findByText('Du mangler rettigheter for å se denne tjenesten.');
    expect(missingRolesText).not.toBeNull();
  });

  function render({
    state = {},
    onEntry = '',
    allowAnonymous = false,
    queries,
  }: {
    state?: Partial<IRuntimeState>;
    onEntry?: 'stateless' | 'select-instance' | '';
    allowAnonymous?: boolean;
    queries?: Partial<AppQueriesContext>;
  } = {}) {
    const createStore = configureStore();
    const initialState = structuredClone({
      ...mockInitialState,
      ...state,
    });

    if (onEntry && initialState.applicationMetadata.applicationMetadata) {
      initialState.applicationMetadata.applicationMetadata.onEntry = {
        show: onEntry,
      };
    }
    if (allowAnonymous && initialState.applicationMetadata.applicationMetadata) {
      const appLogic = initialState.applicationMetadata.applicationMetadata.dataTypes[0].appLogic;
      if (appLogic) {
        appLogic.allowAnonymousOnStateless = true;
      }
    }

    const store = createStore(initialState);

    return renderWithProviders(
      <MemoryRouter>
        <Entrypoint />
      </MemoryRouter>,
      { store: store as any },
      queries,
    );
  }
});
