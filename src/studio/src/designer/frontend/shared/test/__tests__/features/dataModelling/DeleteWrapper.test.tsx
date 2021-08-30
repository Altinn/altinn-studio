import { mount } from 'enzyme';
import { Modal, Typography, Button } from '@material-ui/core';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { act } from 'react-dom/test-utils';
import DeleteWrapper from '../../../../features/dataModelling/components/DeleteWrapper';

describe('>>> DeleteWrapper.tsx', () => {
  const language = { administration: { delete_model_confirm: 'Delete {0}?' } };
  let someValue = 'unchangedValue';
  let wrapper: any = null;
  const onDelete = () => {
    someValue = null;
  };
  beforeEach(() => {
    someValue = 'unchangedValue';
    wrapper = null;
  });
  const mountComponent = (schemaName: string) => mount(<DeleteWrapper
    language={language}
    schemaName={schemaName} deleteAction={onDelete}
  />);
  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = renderer.create(
      <DeleteWrapper
        language={language}
        schemaName='deletable-model' deleteAction={() => { /* intentional */ }}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  const openDialog = () => {
    const deleteButton = wrapper.find('button#delete-button');
    deleteButton.at(0).simulate('click');
    return wrapper.find(Modal).find('div.MuiGrid-root');
  };
  it('opens the pop-up if there is a schemaName', () => {
    act(() => {
      wrapper = mountComponent('deletable-model');
    });
    expect(wrapper.find(Modal)).toHaveLength(0);
    const dialog = openDialog();
    expect(wrapper.find(Modal)).toHaveLength(1);
    const target = dialog.find(Typography);
    expect(target).toHaveLength(1);
    expect(target).toBeTruthy();
    expect(target.text()).toBe('Delete deletable-model?');
    expect(dialog.find(Button)).toHaveLength(2);
  });
  it('does not open pop-up if there is no schemaName', () => {
    act(() => {
      wrapper = mountComponent(undefined);
    });
    const dialog = openDialog();
    expect(dialog).toHaveLength(0);
  });
  it('runs the delete action and closes the modal', () => {
    act(() => {
      wrapper = mountComponent('deletable modal');
    });
    const dialog = openDialog();
    expect(someValue).toBeTruthy();
    dialog.find(Button).first().simulate('click');
    expect(wrapper.find(Modal)).toHaveLength(0);
    expect(someValue).toBeFalsy();
  });
  it('cancels as expected', () => {
    act(() => {
      wrapper = mountComponent('deletable modal');
    });
    // click cancel
    const dialog = openDialog();
    expect(wrapper.find(Modal)).toHaveLength(1);
    dialog.find(Button).at(1).simulate('click');
    expect(wrapper.find(Modal)).toHaveLength(0);
    expect(someValue).toBeTruthy();

    // click outside
    openDialog();
    const modalRoot = wrapper.find(Modal);
    expect(modalRoot).toHaveLength(1);
    const target = modalRoot.find('ForwardRef(SimpleBackdrop)');
    target.simulate('click');
    expect(wrapper.find(Modal)).toHaveLength(0);
    expect(someValue).toBeTruthy();
  });
});
