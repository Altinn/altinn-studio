/*import * as React from 'react';
import { mount } from 'enzyme';
// import * as renderer from 'react-test-renderer';
import App from '../src/App';
import configureStore from 'redux-mock-store';
import { Provider, Store } from 'react-redux';

// import * as appDataActions from '../src/actions/appDataActions/actions';
// import * as formDesignerActions from '../src/actions/formDesignerActions/actions';
// import * as formFillerActions from '../src/actions/formFillerActions/actions';
// import * as manageServiceConfigurationActions from '../src/actions/manageServiceConfigurationActions/actions';
// import * as thirdPartyComponentsActions from '../src/actions/thirdPartyComponentsActions/actions';

// import { createStore } from 'redux';

describe('>> App.tsx --- Snapshop', () => {
  const initialState: any = {};
  const mockStore: any = configureStore();
  let store: any, wrapper: any;

  beforeEach(() => {
    store = mockStore(initialState);
    wrapper = mount(<Provider store={mockStore as Store<any>}><App /></Provider>);
  })

  it('+++ Creating snapshot', () => {
    console.log(store, wrapper);
    expect(true).toBe(true);
  });
});

/*describe('>> App.tsx --- Snapshop', () => {
  
});*/

describe('app', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  })
})