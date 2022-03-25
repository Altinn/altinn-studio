import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import DeleteDialog from './DeleteDialog';

describe('DeleteDialog', () => {
  const language = { administration: {} };
  let schemaName: string;

  beforeEach(() => {
    schemaName = 'some-name';
  });

  const mountComponent = () =>
    mount(
      <DeleteDialog
        anchor={document.body}
        language={language}
        schemaName={schemaName}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

  it('Should match snapshot with the least amount of params', () => {
    const wrapper = mountComponent();
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
