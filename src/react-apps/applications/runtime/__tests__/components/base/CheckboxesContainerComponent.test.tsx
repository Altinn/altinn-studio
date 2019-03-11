import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { CheckboxContainerComponent } from '../../../src/components/base/CheckboxesContainerComponent';

describe('>>> components/base/CheckboxesContainerComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  // tslint:disable-next-line:prefer-const
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockGetTextResource: (resourceKey: string) => string;
  let mockIsValid: boolean;
  let mockDesignMode: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockComponent = {
      id: mockId,
      title: 'test-checkboxescontainer',
      component: 'Checkboxes',
      options: [{
        label: 'test-label-1',
        value: 'test-1',
      }, {
        label: 'test-label-1',
        value: 'test-1',
      }],
    };
    mockHandleDataChange = (data: any) => null;
    mockGetTextResource = (resourceKey: string) => 'test';
    mockIsValid = true;
    mockDesignMode = true;
  });

  it('>>> Capture snapshot of CheckboxesContainerComponent', () => {
    const rendered = renderer.create(
      <CheckboxContainerComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
        validationMessages={{}}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
