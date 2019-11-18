/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';

import { shallow } from 'enzyme';
import { ButtonComponentClass } from '../../../src/components/base/ButtonComponent';

describe('>>> components/base/ButtonComponent.tsx', () => {
  let mockId: string;
  let mockText: string;
  let formDataCount: number;
  let mockHandleDataChange: (value: any) => void;
  let mockDisabled: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockHandleDataChange = (data: any) => null;
    mockDisabled = false;
    mockText = 'Submit form';
    formDataCount = 0;
  });

  it('+++ should submit button should have text \'Submit form\'', () => {
    const wrapper = shallow(
      <ButtonComponentClass
        id={mockId}
        text={mockText}
        handleDataChange={mockHandleDataChange}
        disabled={mockDisabled}
        unsavedChanges={true}
        validations={{}}
        formDataCount={formDataCount}
      />,
    );
    const submitBtn = wrapper.find('button#' + mockId);
    expect(submitBtn.text()).toEqual(mockText);

  });
});
