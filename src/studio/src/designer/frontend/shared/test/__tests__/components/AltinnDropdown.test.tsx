import 'jest';
import * as React from 'react';
import { shallow } from 'enzyme';
import { MenuItem } from '@material-ui/core';

import { AltinnDropdown } from '../../../components/AltinnDropdown';

describe('AltinnDropdown DropdownItems', () => {
  it('Should accept array of strings as dropdownItems, and use the string as both label and value', () => {
    const items = ['item1', 'item2', 'item3'];

    const component = shallow(
      <AltinnDropdown
        dropdownItems={items}
        id='id'
        handleChange={() => {}}
        selectedValue=''
        disabled={false}
      />,
    );

    expect(component.find(MenuItem).length).toBe(3);

    expect(component.find(MenuItem).at(0).text()).toBe('item1');
    expect(component.find(MenuItem).at(0).props().value).toBe('item1');

    expect(component.find(MenuItem).at(1).text()).toBe('item2');
    expect(component.find(MenuItem).at(1).props().value).toBe('item2');

    expect(component.find(MenuItem).at(2).text()).toBe('item3');
    expect(component.find(MenuItem).at(2).props().value).toBe('item3');
  });

  it('Should accept array of label/value pairs as dropdownItems, and use label property as label, and value property as value', () => {
    const items = [
      {
        value: 'val1',
        label: 'label1',
      },
      {
        value: 'val2',
        label: 'label2',
      },
      {
        value: 'val3',
        label: 'label3',
      },
    ];

    const component = shallow(
      <AltinnDropdown
        dropdownItems={items}
        id='id'
        handleChange={() => {}}
        selectedValue=''
        disabled={false}
      />,
    );

    expect(component.find(MenuItem).length).toBe(3);

    expect(component.find(MenuItem).at(0).text()).toBe('label1');
    expect(component.find(MenuItem).at(0).props().value).toBe('val1');

    expect(component.find(MenuItem).at(1).text()).toBe('label2');
    expect(component.find(MenuItem).at(1).props().value).toBe('val2');

    expect(component.find(MenuItem).at(2).text()).toBe('label3');
    expect(component.find(MenuItem).at(2).props().value).toBe('val3');
  });
});
