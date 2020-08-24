const Enzyme = require('enzyme');
const EnzymeAdapter = require('enzyme-adapter-react-16');

require('jest');

Enzyme.configure({
  adapter: new EnzymeAdapter(),
});