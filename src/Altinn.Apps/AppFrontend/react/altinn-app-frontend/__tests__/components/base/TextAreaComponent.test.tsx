
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';
import { TextAreaComponent } from '../../../src/components/base/TextAreaComponent';
import { render, fireEvent } from '@testing-library/react';
import { IComponentProps } from 'src/components';

describe('>>> components/base/TextAreaComponent.tsx', () => {
  let mockId: string;

  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockIsValid: boolean;
  let mockReadOnly: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockHandleDataChange = (data: any) => null;
    mockIsValid = true;
    mockReadOnly = false;
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
        {...({} as IComponentProps)}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should set formdata on change', async () => {
    const onDataChanged = jest.fn();
    const {findByTestId} = renderTextAreaComponent({handleDataChange: onDataChanged});
    const textAreaComponent: any = await findByTestId(mockId);
    expect(textAreaComponent.value).toEqual('');
    fireEvent.change(textAreaComponent, {target: {value: 'Test123'}});
    expect(textAreaComponent.value).toEqual('Test123');
  });

  it('+++ should render editable component when readOnly is false', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={mockReadOnly}
        {...({} as IComponentProps)}
      />,
    );
    expect(wrapper.find('textarea').hasClass('disabled')).toBe(false);
    expect(wrapper.find('textarea').prop('readOnly')).toBe(false);
  });

  it('+++ should render un-editable component when readOnly is true', () => {
    const wrapper = mount(
      <TextAreaComponent
        id={mockId}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
        readOnly={true}
        {...({} as IComponentProps)}
      />,
    );
    expect(wrapper.find('textarea').hasClass('disabled')).toBe(true);
    expect(wrapper.find('textarea').prop('readOnly')).toBe(true);
  });

  function renderTextAreaComponent(props: Partial<IComponentProps> = {}) {
    const defaultProps: IComponentProps = {
      id: mockId,
      formData: mockFormData,
      handleDataChange: mockHandleDataChange,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
    } as IComponentProps;

    return render(<TextAreaComponent {...defaultProps} {...props}/>);
  }

});
