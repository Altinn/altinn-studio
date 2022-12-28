import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompAttachmentList extends ILayoutCompBase<'AttachmentList'> {
  dataTypeIds?: string[];
  includePDF?: boolean;
}
