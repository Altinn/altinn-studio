import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { DropdownComponent } from '../../../../components/base/DropdownComponent';

describe('>>> components/base/DropdownComponent.tsx --- Snapshot', () => {
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
      title: 'test-dropdowncomponent',
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

  it('>>> Capture snapshot of DropdownComponent', () => {
    const rendered = renderer.create(
      <DropdownComponent
        id={mockId}
        component={mockComponent}
        formData={mockFormData}
        handleDataChange={mockHandleDataChange}
        getTextResource={mockGetTextResource}
        isValid={mockIsValid}
        designMode={mockDesignMode}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
