import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { App } from './App';

export { App as SchemaEditorApp }  from './App';

ReactDOM.render(
<React.StrictMode>
  <App />
</React.StrictMode>,
document.getElementById('root')
)
