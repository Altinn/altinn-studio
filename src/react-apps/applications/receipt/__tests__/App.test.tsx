import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from '../src/App';

describe('>>> App.test.tsx', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<App />, div);
    ReactDOM.unmountComponentAtNode(div);
  });
});
