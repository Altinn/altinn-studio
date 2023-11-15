import React from 'react';

import { screen } from '@testing-library/react';

import { DropzoneComponent } from 'src/layout/FileUpload/DropZone/DropzoneComponent';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IDropzoneComponentProps } from 'src/layout/FileUpload/DropZone/DropzoneComponent';

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

  it('should include aria-describedby for description if textResourceBindings.description is present', async () => {
    await render({
      textResourceBindings: {
        description: 'description',
      },
    });
    const dropzone = screen.getByTestId(`altinn-drop-zone-${id}`);
    expect(dropzone.getAttribute('aria-describedby')).toContain(`description-${id}`);
  });

  it('should not include aria-describedby for description if textResourceBindings.description is not present', async () => {
    await render();
    const dropzone = screen.getByTestId(`altinn-drop-zone-${id}`);
    expect(dropzone.getAttribute('aria-describedby')).not.toContain(`description-${id}`);
  });

  async function render(props: Partial<IDropzoneComponentProps> = {}) {
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
    await renderWithoutInstanceAndLayout({
      renderer: () => (
        <DropzoneComponent
          {...defaultProps}
          {...props}
        />
      ),
    });
  }
});
