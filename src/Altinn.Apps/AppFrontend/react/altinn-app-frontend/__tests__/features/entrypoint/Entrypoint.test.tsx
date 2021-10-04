import 'jest';
import * as React from 'react';
import { IRuntimeState } from "../../../src/types";
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';
import { Provider } from 'react-redux';
import Entrypoint from '../../../src/features/entrypoint/Entrypoint';
import { render, waitFor } from '@testing-library/react';
import { IApplicationMetadata } from '../../../src/shared/resources/applicationMetadata';
import axios from 'axios';
import { createStore } from 'redux';

jest.mock('axios');

describe('>>> features/entrypoint/Entrypoint.tsx', () => {
  let mockInitialState: IRuntimeState;
  let mockStore: any;
  let mockReducer: any;


  beforeEach(() => {
    mockInitialState = getInitialStateMock({});
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        valid: true,
        validParties: [],
        message: ''
      }
    });
    mockReducer = (state: IRuntimeState, action: string): IRuntimeState => {
      if (action === 'queue/startInitialStatelessQueue') {
        return {
          ...state,
          isLoading: {
            stateless: false,
            dataTask: null
          }
        }
      }
      return state;
    };
    mockStore = createStore(mockReducer, mockInitialState);
  });

  it('+++ should show invalid party error if user has no valid parties', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        valid: false,
        validParties: [],
        message: ''
      }
    });
    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>
    );
    await waitFor(() => {
      // validate party
      expect(axios.post).toBeCalled();
    });

    const invalidPartyText = await rendered.findByText('For å starte denne tjenesten må du ha tilganger som knytter deg til en privatperson.');
    expect(invalidPartyText).not.toBeNull();
  });

  it('+++ should show loader while fetching data then start instantiation by default ', async () => {
    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>
    );

    const contentLoader = await rendered.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    const instantiationText = await rendered.findByText('Hold deg fast, nå starter vi!');
    expect(instantiationText).not.toBeNull();
  });

  it('+++ should show loader while fetching data then start statelessQueue if stateless app', async () => {
    const statelessApplication: IApplicationMetadata = {
      ...mockInitialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'stateless'
      }
    }
    const mockStateWithStatelessApplication: IRuntimeState = {
      ...mockInitialState
    };
    mockStateWithStatelessApplication.applicationMetadata.applicationMetadata = statelessApplication;
    mockStore = createStore(mockReducer, mockStateWithStatelessApplication);
    mockStore.dispatch = jest.fn();

    const rendered = render(
      <Provider store={mockStore}>
        <Entrypoint />
      </Provider>
    );

    const contentLoader = await rendered.findByText('Loading...');
    expect(contentLoader).not.toBeNull();

    // should have started the initialStatelessQueue
    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith({ type: 'queue/startInitialStatelessQueue'});
    });
  });

});
