import * as React from 'react';
import logo from './logo.svg';
import './App.css';
import { SchemaEditor } from './schemaEditor';
import { dataMock } from './mockData';
import {updateObject} from './utils';

function App() {
  const onChange = (value: string, path: string) => {
    console.log(`${path}: ${value}`)
    updateObject(dataMock, path, value);
    console.log('Data mock: ', dataMock);
  }

  return (
    <div className="App">
      <SchemaEditor data={dataMock} onChange={onChange}/>
    </div>
  );
}

export default App;
