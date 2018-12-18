const {
  JSDOM
} = require('jsdom');

const {
  document
} = (new JSDOM('<!doctype html><html><body>Bodytext<div id="root"></div></body></html>')).window;

global.document = document;
global.window = document.defaultView;

global.window.resizeTo = (width, height) => {
  global.window.innerWidth = width || global.window.innerWidth;
  global.window.innerHeight = height || global.window.innerHeight;
  global.window.dispatchEvent(new Event('resize'));
};

const Enzyme = require('enzyme');
const EnzymeAdapter = require('enzyme-adapter-react-16');

require('jest');

Enzyme.configure({
  adapter: new EnzymeAdapter(),
});
