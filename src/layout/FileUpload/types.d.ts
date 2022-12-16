import type { ComponentTypes, ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompFileUploadBase<T extends Extract<ComponentTypes, 'FileUpload' | 'FileUploadWithTag'>>
  extends ILayoutCompBase<T> {
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  displayMode: 'simple' | 'list';
  hasCustomFileEndings?: boolean;
  validFileEndings?: string[] | string;
}

export type ILayoutCompFileUpload = ILayoutCompFileUploadBase<'FileUpload'>;
