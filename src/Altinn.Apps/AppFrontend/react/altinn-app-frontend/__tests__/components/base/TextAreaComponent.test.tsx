/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';
import { TextAreaComponent, ITextAreaComponentProps } from '../../../src/components/base/TextAreaComponent';
import { render, fireEvent } from '@testing-library/react';

describe('>>> components/base/TextAreaComponent.tsx', () => {
  let mockId: string;
  // tslint:disable-next-line:prefer-const
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
      />,
    );
    expect(wrapper.find('textarea').hasClass('disabled')).toBe(true);
    expect(wrapper.find('textarea').prop('readOnly')).toBe(true);
  });

  function renderTextAreaComponent(props: Partial<ITextAreaComponentProps> = {}) {
    const defaultProps: ITextAreaComponentProps = {
      id: mockId,
      formData: mockFormData,
      handleDataChange: mockHandleDataChange,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
    };
  
    return render(<TextAreaComponent {...defaultProps} {...props}/>);
  }

});
