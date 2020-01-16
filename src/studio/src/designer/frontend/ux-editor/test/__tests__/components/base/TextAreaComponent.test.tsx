import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { TextAreaComponent } from '../../../../components/base/TextAreaComponent';

describe('>>> components/base/TextAreaComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockIsValid: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockComponent = {
      id: mockId,
      title: 'test-textarea',
      component: 'Checkboxes',
    };
    mockHandleDataChange = (data: any) => null;
    mockIsValid = true;
  });

  it('>>> Capture snapshot of TextAreaComponent', () => {
    const rendered = renderer.create(
      <TextAreaComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
