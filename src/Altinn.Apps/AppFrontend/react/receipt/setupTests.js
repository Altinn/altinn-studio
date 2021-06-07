const Enzyme = require('enzyme');
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

require('jest');

Enzyme.configure({
  adapter: new Adapter(),
});
