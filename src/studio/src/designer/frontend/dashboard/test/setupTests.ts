import * as Enzyme from 'enzyme';
import * as Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import 'jest';
import 'whatwg-fetch';

Enzyme.configure({
  adapter: new Adapter(),
});
