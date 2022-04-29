import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import SchemaEditorApp from './SchemaEditorApp';
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
    wrapper = mount(
      <SchemaEditorApp
        schema={dataMock}
        language={{}}
        onSaveSchema={jest.fn()}
        name='test'
      />,
    );
  });
  expect(wrapper.find('SchemaEditorApp')).toHaveLength(1);
});
