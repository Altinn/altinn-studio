/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';

import { DatepickerComponent } from '../../../src/components/base/DatepickerComponent';

jest.useFakeTimers();

describe('DatepickerComponent', () => {
  let mockId: string;
  let mockComponent: any;
  let mockHandleDataChange: any;

  beforeAll(() => {
    Object.defineProperty(window, 'initDatePicker', {
      value: jest.fn(() => {
        return { matches: true };
      }),
    });
  });

  beforeEach(() => {
    mockId = 'mockId';
    mockComponent = {
      id: mockId,
      component: 'Input',
      type: 'text',
      readOnly: false,
      required: false,
    };
  });

  it('+++ should call handleDataChange on blur, if "isChanged: true"', () => {

    mockHandleDataChange = jest.fn();

    const wrapper = mount(
      <DatepickerComponent
        id={mockId}
        component={mockComponent}
        formData={{}}
        handleDataChange={mockHandleDataChange}
      />,
    );

    expect(wrapper.exists('input#mockId')).toBeTruthy();
    wrapper.find('input#mockId').simulate('change');
    expect(wrapper.state('isChanged')).toBeTruthy();

    // Change state to a defined date
    wrapper.setState({ value: '31.01.2019' });

    wrapper.find('input#mockId').simulate('blur');
    expect(setTimeout).toHaveBeenCalledTimes(1);
    jest.runAllTimers();

    expect(mockHandleDataChange).toHaveBeenCalledTimes(1);
    expect(mockHandleDataChange.mock.calls.length).toBe(1);
    expect(mockHandleDataChange.mock.calls[0][0]).toBe('2019-01-31T00:00:00Z');

    expect(wrapper.state('isChanged')).toBeFalsy();
  });

  it('+++ should not call handleDataChange on blur, as state and input val is equal and isChanged is false , ', () => {

    mockHandleDataChange = jest.fn();

    const wrapper = mount(
      <DatepickerComponent
        id={mockId}
        component={mockComponent}
        formData={{ value: '31.01.2019' }}
        handleDataChange={mockHandleDataChange}
      />,
    );

    // Change state to a defined date
    wrapper.setState({ value: '31.01.2019' });

    expect(wrapper.state('isChanged')).toBeFalsy();

    const input = wrapper.find('input#mockId');
    input.simulate('blur', { target: { value: '31.01.2019' } });

    jest.runAllTimers();
    expect(mockHandleDataChange).toHaveBeenCalledTimes(0);

  });

});
