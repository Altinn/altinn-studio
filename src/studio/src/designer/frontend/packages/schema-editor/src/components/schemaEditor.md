Schema editor example

```tsx
import { Provider } from 'react-redux';
import '../App.css';
import SchemaEditor from './schemaEditor';
import { store } from '../redux/store';
import { dataMock } from '../mockData';

function saveSchema(schema) {
  alert('Saved schema');
};

<div style={{minHeight: 1350, flex: '1 1 auto'}}>
  <Provider store={store}>
    <SchemaEditor schema={dataMock} onSaveSchema={saveSchema} rootItemId={'#/properties/melding'} />
  </Provider>
</div>
```