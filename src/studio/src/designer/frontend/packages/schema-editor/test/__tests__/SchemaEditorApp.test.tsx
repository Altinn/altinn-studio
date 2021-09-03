import * as React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
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

test('renders schema editor app', () => {
  let wrapper: any = null;
  act(() => {
    wrapper = mount(
      <SchemaEditorApp
        schema={dataMock}
        language={{}}
        onSaveSchema={() => {}}
        name='test'
      />,
    );
  });
  expect(wrapper.find('SchemaEditorApp')).toHaveLength(1);
});
