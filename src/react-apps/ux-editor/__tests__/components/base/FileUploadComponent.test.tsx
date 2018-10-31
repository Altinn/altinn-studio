import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { FileUploadComponent } from '../../../src/components/base/FileUploadComponent';

describe('>>> components/base/FileUploadComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockComponent: any;
  let mockFormData: any;
  let mockHandleDataChange: (value: any) => void;
  let mockIsValid: boolean;

  beforeEach(() => {
    mockId = "mock-id";
    mockComponent = {
      id: mockId,
      title: "test-fileuploader",
      component: "Checkboxes",
    };
    mockHandleDataChange = (data: any) => null;
    mockIsValid = true;
  });

  it('>>> Capture snapshot of FileUploadComponent', () => {
    const rendered = renderer.create(
      <FileUploadComponent
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