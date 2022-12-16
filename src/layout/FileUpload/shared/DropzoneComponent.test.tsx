import React from 'react';

import { render, screen } from '@testing-library/react';

import { DropzoneComponent } from 'src/layout/FileUpload/shared/DropzoneComponent';
import type { IDropzoneComponentProps } from 'src/layout/FileUpload/shared/DropzoneComponent';

describe('DropzoneComponent', () => {
  const id = 'mock-id';
  const isMobile = false;
  const language = {};
  const maxFileSizeInMB = 20;
  const readOnly = false;
  const onClick = jest.fn();
  const onDrop = jest.fn();
  const hasValidationMessages = false;
  const hasCustomFileEndings = false;
  const validFileEndings = '';
  const textResourceBindings = {};

  it('should include aria-describedby for description if textResourceBindings.description is present', () => {
    renderDropzone({
      textResourceBindings: {
        description: 'description',
      },
    });
    const dropzone = screen.getByTestId(`altinn-drop-zone-${id}`);
    expect(dropzone.getAttribute('aria-describedby')).toContain(`description-${id}`);
  });

  it('should not include aria-describedby for description if textResourceBindings.description is not present', () => {
    renderDropzone();
    const dropzone = screen.getByTestId(`altinn-drop-zone-${id}`);
    expect(dropzone.getAttribute('aria-describedby')).not.toContain(`description-${id}`);
  });

  function renderDropzone(props: Partial<IDropzoneComponentProps> = {}) {
    const defaultProps = {
      id,
      isMobile,
      language,
      maxFileSizeInMB,
      readOnly,
      onClick,
      onDrop,
      hasValidationMessages,
      hasCustomFileEndings,
      validFileEndings,
      textResourceBindings,
    } as IDropzoneComponentProps;
    render(
      <DropzoneComponent
        {...defaultProps}
        {...props}
      />,
    );
  }
});
