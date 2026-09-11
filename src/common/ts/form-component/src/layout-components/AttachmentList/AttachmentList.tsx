import type { ReactElement } from 'react';

import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import { AttachmentGroupings } from './attachments/AttachmentGroupings';
import { MainAttachmentHeader } from './attachments/AttachmentHeader';
import { Attachments } from './attachments/Attachments';
import type { DisplayAttachment } from './attachments/types';

export type { DisplayAttachment } from './attachments/types';
export { Attachments } from './attachments/Attachments';
export type { AttachmentsProps } from './attachments/Attachments';
export { AttachmentGroupings } from './attachments/AttachmentGroupings';
export type { AttachmentGroupingsProps } from './attachments/AttachmentGroupings';
export { CollapsibleAttachments } from './attachments/CollapsibleAttachments';
export { MainAttachmentHeader, SubAttachmentHeader } from './attachments/AttachmentHeader';

export type AttachmentListProps = {
  componentId: string;
  attachments: DisplayAttachment[];
  title?: string;
  groupByDataTypeGrouping?: boolean;
  showLinks?: boolean;
  showDescription?: boolean;
  innerGrid?: IGridStyling;
};

export function AttachmentList({
  componentId,
  attachments,
  title,
  groupByDataTypeGrouping = false,
  showLinks = true,
  showDescription = false,
  innerGrid,
}: AttachmentListProps) {
  const { lang } = useTranslation();

  const titleNode: ReactElement | undefined = title ? (
    <MainAttachmentHeader title={<>{lang(title)}</>} />
  ) : undefined;

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      {groupByDataTypeGrouping ? (
        <AttachmentGroupings
          attachments={attachments}
          title={titleNode}
          hideCollapsibleCount={true}
          showLinks={showLinks}
          showDescription={showDescription}
        />
      ) : (
        <Attachments
          attachments={attachments}
          title={titleNode}
          showLinks={showLinks}
          showDescription={showDescription}
        />
      )}
    </ComponentStructure>
  );
}
