import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { screen, act, render } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { dataMock } from './mockData';

let container: any = null;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

test('renders schema editor app', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = render(
      <SchemaEditorApp
        schema={dataMock}
        language={{}}
        onSaveSchema={jest.fn()}
        name='test'
      />,
    );
  });
  expect(screen.getByTestId('schema-editor')).toBeDefined();
});
