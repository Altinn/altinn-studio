import * as Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import 'core-js/es/string/replace-all';
import 'jest';
import '@testing-library/jest-dom';

Enzyme.configure({
  adapter: new Adapter(),
});
