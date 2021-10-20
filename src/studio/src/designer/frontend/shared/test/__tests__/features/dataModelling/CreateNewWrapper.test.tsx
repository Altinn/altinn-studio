import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { act } from 'react-dom/test-utils';
import CreateNewWrapper from '../../../../features/dataModelling/components/CreateNewWrapper';

describe('>>> CreateNewWrapper.tsx', () => {
  const language = { administration: {} };
  let someValue = 'unchangedValue';
  let wrapper: any = null;
  const changeValue = (v: { name: string, relativePath?: string }) => {
    someValue = `${v.name}${v.relativePath}`;
  };
  beforeEach(() => {
    someValue = 'unchangedValue';
    wrapper = null;
  });
  const mountComponent = (
    modelNames: string[],
    onCreate?: (payload: {name: string}) => void,
    c: boolean = false,
  ) => mount(<CreateNewWrapper
    language={language}
    dataModelNames={modelNames} createAction={onCreate}
    createPathOption={c}
  />);
  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <CreateNewWrapper
        language={language}
        dataModelNames={[]} createAction={() => { /* intentional */ }}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('opens the popup when clicking new', () => {
    act(() => {
      wrapper = mountComponent([]);
    });
    const newButton = wrapper.find('TopToolbarButton');
    expect(wrapper.find('input').length).toBe(0);
    newButton.at(0).simulate('click');
    expect(wrapper.find('input').length).toBe(1);
    const inputField = wrapper.find('div#newModelInput').find('input');
    expect(inputField).toBeTruthy();
  });
  const openDialog = () => {
    const newButton = wrapper.find('TopToolbarButton');
    newButton.at(0).simulate('click');
    return wrapper.find('div#newModelInput').find('ForwardRef(TextField)');
  };
  it('executes the on change function', () => {
    act(() => {
      wrapper = mountComponent(['some', 'names'], changeValue);
    });
    const inputField = openDialog().find('input');
    inputField.simulate('change', { target: { value: 'new-model' } });
    inputField.simulate('blur');
    const okButton = wrapper.find('#newModelInput')
      .find('button');
    okButton.simulate('click');
    wrapper.update();
    expect(someValue).toBe('new-modelundefined');
  });
  it('should call createAction callback when submit button is clicked', () => {
    act(() => {
      wrapper = mountComponent(['some', 'names'], changeValue, true);
    });
    const inputField = openDialog().find('input');
    inputField.simulate('change', { target: { value: 'new-model' } });
    inputField.simulate('blur');
    const okButton = wrapper.find('#newModelInput')
      .find('button');
    okButton.simulate('click');
    wrapper.update();
    expect(someValue).toBe('new-model');
  });
  it('should call createAction callback when input is focused and enter key is pressed', () => {
    act(() => {
      wrapper = mountComponent(['some', 'names'], changeValue);
    });
    const inputField = openDialog();
    inputField.find('input').simulate('change', { target: { value: 'new-model' } });
    inputField.find('input').simulate('keydown', { key: 'Enter', keyCode: 13 });
    expect(someValue).toBe('new-modelundefined');
  });
  it('fails to run create name for an existing model', () => {
    act(() => {
      wrapper = mountComponent(['some', 'existing-model', 'names'], changeValue);
    });
    const inputField = openDialog();
    inputField.simulate('change', { target: { value: 'existing-model' } });
    inputField.simulate('blur');
    const okButton = wrapper.find('#newModelInput').find('button');
    okButton.simulate('click');
    wrapper.update();
    expect(someValue).toBe('unchangedValue');
  });
  it('fails to run create when name-field is empty', () => {
    act(() => {
      wrapper = mountComponent(['some', 'existing-model', 'names'], changeValue);
    });
    const inputField = openDialog();
    inputField.simulate('change', { target: { value: 'dirty-field' } });
    inputField.simulate('blur');
    inputField.simulate('change', { target: { value: '' } });
    inputField.simulate('blur');
    const okButton = wrapper.find('#newModelInput').find('button');
    okButton.simulate('click');
    wrapper.update();
    expect(someValue).toBe('unchangedValue');
  });
});
