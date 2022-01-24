import 'jest';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import DropdownComponent from '../../../src/components/base/DropdownComponent';
import { IComponentProps } from 'src/components';

describe('>>> components/base/DropdownComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockOptionsId;
  let mockFormData: any;
  let mockInitialState: any;
  let mockStore: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockIsValid: boolean;

  beforeEach(() => {
    const createStore = configureStore();
    mockId = 'mock-id';
    mockOptionsId = 'test';
    mockFormData = '';
    mockInitialState = {
      optionState: {
        options: {
          test: [
            { value: 'some_value', label: 'some_label' },
            { value: 'some_value_2', label: 'some_label_2' }
          ],
        },
      },
    };
    mockHandleDataChange = () => null;
    mockGetTextResource = () => 'test';
    mockIsValid = true;
    mockStore = createStore(mockInitialState);
  });

  it('>>> Capture snapshot of DropdownComponent', () => {
    const rendered = render(
      <Provider store={mockStore}>
        <DropdownComponent
          id={mockId}
          formData={mockFormData}
          handleDataChange={mockHandleDataChange}
          getTextResourceAsString={mockGetTextResource}
          optionsId={mockOptionsId}
          isValid={mockIsValid}
          readOnly={false}
          {...({} as IComponentProps)}
        />
      </Provider>,
    );
    expect(rendered.asFragment()).toMatchSnapshot();
  });
//   it('+++ should trigger onDataChanged on change', () => {
//     const mountedDropdownComponent = mount(
//       <DropdownComponent
//         id={mockId}
//         options={mockOptions}
//         formData={mockFormData}
//         handleDataChange={mockHandleDataChange}
//         getTextResource={mockGetTextResource}
//         isValid={mockIsValid}
//       />,
//     );
//     const instance = mountedDropdownComponent.instance() as DropdownComponent;
//     const spy = jest.spyOn(instance, 'onDataChanged');
//     instance.forceUpdate();
//     mountedDropdownComponent.find('select').simulate('change', { target: { value: 'test-2' } });
//     expect(spy).toHaveBeenCalled();
//   });
});
