import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getDescriptionId, getLabelId } from 'src/components/label/Label';
import { DropzoneComponent } from 'src/layout/FileUpload/DropZone/DropzoneComponent';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';
import type { IDropzoneComponentProps } from 'src/layout/FileUpload/DropZone/DropzoneComponent';

describe('DropzoneComponent', () => {
  const id = 'mock-id';
  const isMobile = false;
  const maxFileSizeInMB = 20;
  const readOnly = false;
  const onClick = jest.fn();
  const onDrop = jest.fn();
  const hasValidationMessages = false;
  const hasCustomFileEndings = false;
  const validFileEndings = '';

  const defaultProps: IDropzoneComponentProps = {
    id,
    isMobile,
    maxFileSizeInMB,
    readOnly,
    onClick,
    onDrop,
    hasValidationMessages,
    hasCustomFileEndings,
    validFileEndings,
  };

  it('should include aria-describedby for description if textResourceBindings.description is present', async () => {
    await renderWithMinimalProviders({
      renderer: () => (
        <>
          <label id={getLabelId(id)}>Enkel filopplasting</label>
          <div id={getDescriptionId(id)}>Enkel beskrivelse</div>
          <DropzoneComponent
            {...defaultProps}
            labelId={getLabelId(id)}
            descriptionId={getDescriptionId(id)}
          />
        </>
      ),
    });
    const dropzone = screen.getByRole('presentation', {
      name: /Enkel filopplasting/i,
      description: /Enkel beskrivelse/i,
    });
    expect(dropzone.getAttribute('aria-describedby')).toContain(getDescriptionId(id));
  });

  it('should not include aria-describedby for description if textResourceBindings.description is not present', async () => {
    await renderWithMinimalProviders({
      renderer: () => <DropzoneComponent {...defaultProps} />,
    });

    const dropzone = screen.getByRole('presentation');
    expect(dropzone.getAttribute('aria-describedby')).not.toContain(getDescriptionId(id));
  });
});
