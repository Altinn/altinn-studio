import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from '../src/App';
import { store } from '../src/store';

describe('Service-Development - /service-development/src/App.tsx', () => {

  it('matches snapshot', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>);
    const app = wrapper.shallow();
    expect(app).toMatchSnapshot();
  });
});
