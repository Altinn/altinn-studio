import { mount, ReactWrapper } from 'enzyme';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import AltinnPartySearch from './altinnPartySearch';

describe('AltinnPartySearch', () => {
  let mountedComponent: ReactWrapper;
  let mockOnSearchUpdate: (searchString: string) => void;
  let createStore: any;
  let mockStore: any;
  let testSearchString: any;

  beforeEach(() => {
    mockOnSearchUpdate = (searchString: string) =>
      (testSearchString = searchString);
    createStore = configureStore();
    mockStore = createStore({
      language: {
        language: [],
      },
    });
    mountedComponent = mount(
      <Provider store={mockStore}>
        <AltinnPartySearch onSearchUpdated={mockOnSearchUpdate} />
      </Provider>,
    );
  });

  it('should use callback to update when search string is changed', () => {
    const inputField = mountedComponent.find('input');
    inputField.simulate('change', { target: { value: 'a' } });
    expect(testSearchString).toEqual('a');
  });
});
