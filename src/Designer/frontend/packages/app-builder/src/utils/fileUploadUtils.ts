import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { LayoutComponent } from '../types';

/**
 * The file types the user can allow, by the name they know them by: the types production apps limit
 * their file uploads to most often. No type chosen means every type is allowed.
 */
export const fileTypeEndings = {
  PDF: ['.pdf'],
  JPG: ['.jpg', '.jpeg'],
  PNG: ['.png'],
  TIFF: ['.tif', '.tiff'],
  Word: ['.doc', '.docx'],
  Excel: ['.xls', '.xlsx'],
  ODT: ['.odt'],
  TXT: ['.txt'],
} as const;

export type FileTypeName = keyof typeof fileTypeEndings;

export const fileTypeNames = Object.keys(fileTypeEndings) as FileTypeName[];

/**
 * The file endings the component allows. Layout files write them as a list or as one string with
 * commas, such as ".pdf, .png", and ux-editor writes both.
 */
function getValidFileEndings(component: LayoutComponent): string[] {
  const endings: unknown = component.validFileEndings;
  if (typeof endings === 'string') {
    return endings
      .split(',')
      .map((ending) => ending.trim())
      .filter(Boolean);
  }
  return Array.isArray(endings) ? endings.map(String) : [];
}

export function getAllowedFileTypes(component: LayoutComponent): FileTypeName[] {
  const endings = getValidFileEndings(component);
  return fileTypeNames.filter((name) =>
    fileTypeEndings[name].some((ending) => endings.includes(ending)),
  );
}

export function setAllowedFileTypes(
  component: LayoutComponent,
  names: FileTypeName[],
): LayoutComponent {
  const { hasCustomFileEndings: _hasCustom, validFileEndings: _endings, ...rest } = component;
  if (names.length === 0) return rest as LayoutComponent;
  const validFileEndings = names.flatMap((name) => [...fileTypeEndings[name]]);
  return { ...component, hasCustomFileEndings: true, validFileEndings };
}

/**
 * The data type a file upload saves its attachments as. It has the component's ID and repeats its
 * limits, since the backend checks uploads against the data type, not the component.
 */
export function toAttachmentDataType(
  component: LayoutComponent,
  taskId: string | undefined,
): ApplicationAttachmentMetadata {
  const endings = getValidFileEndings(component);
  return {
    id: component.id,
    taskId,
    maxCount: component.maxNumberOfAttachments ?? 1,
    // A minimum that depends on a rule is checked by the form, so the data type takes any number.
    minCount:
      typeof component.minNumberOfAttachments === 'number' ? component.minNumberOfAttachments : 0,
    maxSize: component.maxFileSizeInMB,
    fileType: endings.join(', '),
  };
}
