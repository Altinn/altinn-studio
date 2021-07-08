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

const language = {
  schema_editor: {
    add_property: 'Legg til egenskap',
    create_reference: 'Lag referanse',
    properties: 'Egenskaper',
    ...
  }
}

<div style={{minHeight: 1350, flex: '1 1 auto'}}>
  <Provider store={store}>
    <SchemaEditor schema={dataMock} onSaveSchema={saveSchema} name='melding' language={language} />
  </Provider>
</div>
```
