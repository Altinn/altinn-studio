import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getDescriptionId } from 'src/components/label/Label';
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
    const dropzone = screen.getByRole('presentation', {
      name: /Dra og slipp eller let etter fil Tillatte filformater er: alle/i,
    });
    expect(dropzone.getAttribute('aria-describedby')).toContain(getDescriptionId(id));
  });

  it('should not include aria-describedby for description if textResourceBindings.description is not present', async () => {
    await render();
    const dropzone = screen.getByRole('presentation', {
      name: /Dra og slipp eller let etter fil Tillatte filformater er: alle/i,
    });
    expect(dropzone.getAttribute('aria-describedby')).not.toContain(getDescriptionId(id));
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
