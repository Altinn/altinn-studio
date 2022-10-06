# Getting Started with JSON Schema Editor

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Running/testing JSON Schema Editor locally

The Schema editor is set up to be a package, and is currently not set up to run in development mode locally.
To run the Schema editor while developing, use the styleguide that has been set up for the components.

### yarn dlx styleguidist server

Will start the styleguide in dev mode.

## Available Scripts

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn run build-rollup`

Builds the app as a package for production to the `dist` folder.\

### Schema editor example

```tsx
import { Provider } from 'react-redux';
import '../App.css';
import { SchemaEditor } from './SchemaEditor';
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

<div style={{
    minHeight: 1350,
    flex: '1 1 auto'
}}>
    <Provider store={store}>
        <SchemaEditor schema={dataMock} onSaveSchema={saveSchema} name='melding' language={language}/>
    </Provider>
</div>
```

### StyledSelect

```ts
import { StyledSelect } from './TypeSelect';
function onChange(id, value) {
  alert(`Selected type ${value} for ${id}`);
}

<StyledSelect id='sometype' itemType='string' onChange={onChange} />;
```

### Run against mock

`http://localhost:8080/designer/my-org/my-app#/datamodelling`



### Context menu logic

For each node type we need to establish which actions that should be
availiable:

* Field (String, Int, Boolean)
  * Convert to type ✅
  * Delete 🗑
* Reference
  * Convert to field ❓
  * Go to reference
  * Delete 🗑
* Object
  * Convert to type ✅
  * Add Field ✅
  * Add Combination ✅
  * Add Reference ✅
  * Delete 🗑
* Combination
  * Add Field ❌
  * Add Reference
  * Delete 🗑
