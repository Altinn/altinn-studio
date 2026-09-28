import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { FormFileUploaderComponent } from '../types/FormComponent';

type AttachmentMetadataProperties = Pick<
  ApplicationAttachmentMetadata,
  'fileType' | 'maxCount' | 'minCount' | 'maxSize'
>;

export function getFileUploadMetadataProperties(
  component: FormFileUploaderComponent,
): AttachmentMetadataProperties {
  return {
    fileType: Array.isArray(component.validFileEndings)
      ? component.validFileEndings.join(', ')
      : component.validFileEndings,
    maxCount: requireStaticNumber(component.maxNumberOfAttachments, 'maxNumberOfAttachments'),
    minCount: requireStaticNumber(component.minNumberOfAttachments, 'minNumberOfAttachments'),
    maxSize: component.maxFileSizeInMB,
  };
}

function requireStaticNumber(value: unknown, property: string): number {
  if (typeof value === 'number') return value;
  throw new Error(`${property} must be a static number when synchronizing attachment metadata.`);
}
