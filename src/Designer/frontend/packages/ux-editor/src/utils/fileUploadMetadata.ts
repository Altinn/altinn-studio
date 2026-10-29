import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { FormFileUploaderComponent } from '../types/FormComponent';

type AttachmentMetadataProperties = Pick<
  ApplicationAttachmentMetadata,
  'fileType' | 'maxCount' | 'minCount' | 'maxSize'
>;

export function getFileUploadMetadataProperties(
  component: FormFileUploaderComponent,
  existingMetadata?: Pick<ApplicationAttachmentMetadata, 'maxCount' | 'minCount'>,
): AttachmentMetadataProperties {
  return {
    fileType: Array.isArray(component.validFileEndings)
      ? component.validFileEndings.join(', ')
      : component.validFileEndings,
    maxCount: getStaticCount(
      component.maxNumberOfAttachments,
      'maxNumberOfAttachments',
      existingMetadata?.maxCount,
    ),
    minCount: getStaticCount(
      component.minNumberOfAttachments,
      'minNumberOfAttachments',
      existingMetadata?.minCount,
    ),
    maxSize: component.maxFileSizeInMB,
  };
}

function getStaticCount(value: unknown, property: string, existingCount?: number): number {
  if (typeof value === 'number') return value;
  // Layout expressions cannot be evaluated as static, application-wide limits.
  if (Array.isArray(value) && typeof existingCount === 'number') return existingCount;
  throw new Error(`${property} must be a static number when synchronizing attachment metadata.`);
}
