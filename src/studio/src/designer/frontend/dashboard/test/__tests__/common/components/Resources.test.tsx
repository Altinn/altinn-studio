import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import { Resources } from 'common/components/Resources';

describe('Dashboard > Common > Components > Resources', () => {
  it('should render', () => {
    const initialState = {
      language: {
        language: {},
      },
    };
    const store = configureStore()(initialState);

    const component = mount(
      <Provider store={store}>
        <Resources />
      </Provider>,
      { context: { store } },
    );

    expect(component.isEmptyRender()).toBe(false);
  });
});
