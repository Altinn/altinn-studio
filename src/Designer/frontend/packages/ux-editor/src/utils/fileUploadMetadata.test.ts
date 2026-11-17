import { describe, expect, it } from 'vitest';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormFileUploaderComponent } from '../types/FormComponent';
import { getFileUploadMetadataProperties } from './fileUploadMetadata';

const component: FormFileUploaderComponent = {
  id: 'upload',
  type: ComponentType.FileUpload,
  displayMode: 'list',
  maxFileSizeInMB: 25,
  maxNumberOfAttachments: 3,
  minNumberOfAttachments: 1,
  validFileEndings: ['.pdf', '.png'],
};

describe('getFileUploadMetadataProperties', () => {
  it('serializes file-ending arrays for the metadata API', () => {
    expect(getFileUploadMetadataProperties(component)).toEqual({
      fileType: '.pdf, .png',
      maxCount: 3,
      minCount: 1,
      maxSize: 25,
    });
  });

  it('rejects expression values that cannot be represented in static app metadata', () => {
    expect(() =>
      getFileUploadMetadataProperties({
        ...component,
        maxNumberOfAttachments: ['if', true, 3, 1],
      }),
    ).toThrow('maxNumberOfAttachments must be a static number');
  });

  it('preserves existing static counts for expression limits', () => {
    expect(
      getFileUploadMetadataProperties(
        {
          ...component,
          maxNumberOfAttachments: ['if', true, 3, 1],
          minNumberOfAttachments: ['if', true, 1, 0],
        },
        { maxCount: 10, minCount: 0 },
      ),
    ).toEqual({
      fileType: '.pdf, .png',
      maxCount: 10,
      minCount: 0,
      maxSize: 25,
    });
  });
});
