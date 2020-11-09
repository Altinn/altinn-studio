Schema editor example

```js
import { Provider } from 'react-redux';
import '../App.css';
import SchemaEditor from './schemaEditor';
import { store } from '../redux/store';

<div style={{height: 1200}}>
  <Provider store={store}>
    <SchemaEditor saveUrl={''} />
  </Provider>
</div>
```