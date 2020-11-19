import React from 'react';
import { render } from '@testing-library/react';
import SchemaEditorApp from '../../src/SchemaEditorApp';
import { dataMock } from '../../src/mockData';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

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
        onSaveSchema={() => {}}
        rootItemId='#/properties/melding'
      />
    );
  });
  expect(utils.container.firstChild.getAttribute('id')).toBe('schema-editor-container');
});
