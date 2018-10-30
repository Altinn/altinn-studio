import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { InputComponent } from '../../../src/components/base/InputComponent';

describe('>>> components/base/InputComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockIsValid: boolean;

  beforeEach(() => {
    mockId = "mock-id";
    mockComponent = {
      id: mockId,
      title: "test-checkboxescontainer",
      component: "Checkboxes",
    };
    mockHandleDataChange = (data: any) => null;
    mockIsValid = true;
  });

  it('>>> Capture snapshot of InputComponent', () => {
    const rendered = renderer.create(
      <InputComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        isValid={mockIsValid}
      />
    );
    expect(rendered).toMatchSnapshot();
  });
});