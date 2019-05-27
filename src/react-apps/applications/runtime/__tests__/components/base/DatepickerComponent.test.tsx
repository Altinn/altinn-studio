/* tslint:disable:jsx-wrap-multiline */
import { mount, shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { DatepickerComponent } from '../../../src/components/base/DatepickerComponent';

jest.useFakeTimers();

describe('DatepickerComponent', () => {
  let mockId: string;
  let mockReadOnly: boolean;
  let mockRequired: boolean;
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
    mockReadOnly = false;
    mockRequired = false;
  });

  it('+++ should call handleDataChange on blur, if "isChanged: true"', () => {

    mockHandleDataChange = jest.fn();

    const wrapper = mount(
      <DatepickerComponent
        id={mockId}
        readOnly={mockReadOnly}
        required={mockRequired}
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
        readOnly={mockReadOnly}
        required={mockRequired}
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
  it('+++ should have class disabled-date when readOnly', () => {
    const shallowDataPicker = mount(
      <DatepickerComponent
        id={mockId}
        readOnly={true}
        required={mockRequired}
        formData={{ value: '31.01.2019' }}
        handleDataChange={mockHandleDataChange}
      />,
    );
    expect(shallowDataPicker.find('input').hasClass('disabled-date')).toBe(true);
  });

});
