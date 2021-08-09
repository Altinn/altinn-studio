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
  const changeValue = (v: string) => {
    someValue = v;
  };
  beforeEach(() => {
    someValue = 'unchangedValue';
    wrapper = null;
  });
  const mountComponent = (modelNames: string[], onCreate?: (v: string) => void) => mount(<CreateNewWrapper
    language={language}
    dataModelNames={modelNames} createAction={onCreate}
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
    const newButton = wrapper.find('button#new-button');
    expect(wrapper.find('input').length).toBe(0);
    newButton.at(0).simulate('click');
    expect(wrapper.find('input').length).toBe(1);
    const inputField = wrapper.find('div#newModelInput').find('input');
    expect(inputField).toBeTruthy();
  });
  const openDialog = () => {
    const newButton = wrapper.find('button#new-button');
    newButton.at(0).simulate('click');
    return wrapper.find('div#newModelInput').find('input');
  };
  it('executes the on change function', () => {
    act(() => {
      wrapper = mountComponent(['some', 'names'], changeValue);
    });
    const inputField = openDialog();
    inputField.simulate('change', { target: { value: 'new-model' } });
    inputField.simulate('blur');
    const okButton = wrapper.find('#newModelInput').find('button');
    okButton.simulate('click');
    wrapper.update();
    expect(someValue).toBe('new-model');
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
  it('fails to run create when field is empty', () => {
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
