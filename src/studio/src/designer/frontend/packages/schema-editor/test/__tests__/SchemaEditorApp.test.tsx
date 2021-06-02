import React from 'react';
import { render } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import SchemaEditorApp from '../../src/SchemaEditorApp';
import { dataMock } from '../../src/mockData';

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

test('renders schema editor container', () => {
  let utils: any = null;
  act(() => {
    utils = render(
      <SchemaEditorApp
        schema={dataMock}
        language={{}}
        onSaveSchema={() => {}}
        rootItemId='#/properties/melding'
      />,
    );
  });
  expect(utils.container.firstChild.getAttribute('id')).toBe('schema-editor-container');
});
