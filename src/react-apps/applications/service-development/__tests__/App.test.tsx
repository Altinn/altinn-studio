import 'jest';
import * as React from 'react';
import App from '../src/App';

import { shallow } from 'enzyme';

describe('Service-Development - /service-development/src/App.tsx', () => {

  it('matches snapshot', () => {
    const wrapper = shallow(<App />);
    const app = wrapper.shallow();
    expect(app).toMatchSnapshot();
  });
});
