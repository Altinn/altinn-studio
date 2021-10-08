import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import TopToolbar from '../../../src/components/TopToolbar';

const makeWrapper = (Toolbar: JSX.Element = <></>, saveAction: any = undefined) => {
  let wrapper: any = null;
  act(() => {
    wrapper = mount(
      <TopToolbar
        Toolbar={Toolbar}
        language={{}}
        saveAction={saveAction}
      />,
    );
  });
  return wrapper;
};

const selectTopToolbar = (wrapper: any) => {
  return wrapper.find('TopToolbar');
};

it('renders the top toolbar', () => {
  const wrapper = makeWrapper();
  const topToolbar = selectTopToolbar(wrapper);
  expect(topToolbar).toHaveLength(1);
});

it('handles a click on the save button', () => {
  let clicked: boolean = false;
  const saveFunc = () => { clicked = true; };
  const wrapper = makeWrapper(<></>, saveFunc);
  const topToolbar = selectTopToolbar(wrapper);
  expect(topToolbar).toHaveLength(1);
  const saveButton = topToolbar.find('TopToolbarButton');
  expect(saveButton).toHaveLength(1);
  saveButton.simulate('click');
  expect(clicked).toBeTruthy();
});
