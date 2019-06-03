/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount, shallow } from 'enzyme';
import { ButtonComponent } from '../../../src/components/base/ButtonComponent';

describe('>>> components/base/ButtonComponent.tsx', () => {
  let mockId: string;
  let mockText: string;
  let formDataCount: number;
  let mockHandleDataChange: (value: any) => void;
  let mockDisabled: boolean;
  let mockUnsavedChanges: boolean;
  let mockValidationResults: any;

  beforeEach(() => {
    mockId = 'mock-id';
    mockHandleDataChange = (data: any) => null;
    mockDisabled = false;
    mockUnsavedChanges = false;
    mockValidationResults = {};
    mockText = 'Submit form';
    formDataCount = 0;
  });

  it('+++ should submit button should have text \'Submit form\'', () => {
    const wrapper = shallow(
      <ButtonComponent
        id={mockId}
        text={mockText}
        handleDataChange={mockHandleDataChange}
        disabled={mockDisabled}
        unsavedChanges={true}
        validationResults={mockValidationResults}
        formDataCount={formDataCount}
      />,
    );
    const submitBtn = wrapper.find('.disabled');
    expect(submitBtn.text()).toEqual(mockText);

  });

  it('+++ should disable submit button and add class disabled if there are unsaved changes', () => {
    const wrapper = mount(
      <ButtonComponent
        id={mockId}
        text={mockText}
        handleDataChange={mockHandleDataChange}
        disabled={mockDisabled}
        unsavedChanges={true}
        validationResults={mockValidationResults}
        formDataCount={formDataCount}
      />,
    );
    const submitBtn = wrapper.find('button#' + mockId);
    expect(submitBtn.hasClass('disabled')).toEqual(true);
    expect(submitBtn.prop('disabled')).toBe(true);
  });

});
