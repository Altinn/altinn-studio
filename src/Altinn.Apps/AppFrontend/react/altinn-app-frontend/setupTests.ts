import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import 'core-js/es/string/replace-all';
import 'jest';
import '@testing-library/jest-dom/extend-expect';

Enzyme.configure({
  adapter: new Adapter(),
});
