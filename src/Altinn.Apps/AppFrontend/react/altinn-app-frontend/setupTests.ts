import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import 'core-js/es/string/replace-all';
import 'jest';
import '@testing-library/jest-dom/extend-expect';

import { IAltinnWindow } from 'src/types';

// org and app is assigned to window object, so to avoid 'undefined' in tests, they need to be set
const altinnWindow = window as Window as IAltinnWindow;
altinnWindow.org = 'ttd';
altinnWindow.app = 'test';

Enzyme.configure({
  adapter: new Adapter(),
});
