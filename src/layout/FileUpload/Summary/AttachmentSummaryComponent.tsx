import React from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import classes from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IAttachmentSummaryComponent {
  targetNode: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
}

export function AttachmentSummaryComponent({ targetNode }: IAttachmentSummaryComponent) {
  const attachments = useUploaderSummaryData(targetNode.baseId);
  const { langAsString } = useLanguage();
  const component = useItemWhenType(targetNode.baseId, targetNode.type);
  const hasTag = component.type === 'FileUploadWithTag';

  const { options: allOptions } = useOptionsFor(targetNode.baseId, 'single');
  const options = hasTag ? allOptions : undefined;

  const tryToGetTextResource = (tag: string) => {
    const label = options?.find((option) => option.value === tag)?.label;
    return langAsString(label);
  };

  return (
    <div
      className={hasTag ? classes.containerWithTag : classes.container}
      data-testid={`${hasTag ? 'attachment-with-tag-summary' : 'attachment-summary-component'}`}
    >
      {attachments.length === 0 ? (
        <div className={classes.emptyField}>
          <Lang id='general.empty_summary' />
        </div>
      ) : (
        attachments.map((attachment) => {
          const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;
          return (
            <div
              className={hasTag ? classes.rowWithTag : classes.row}
              key={`attachment-summary-${uniqueId}`}
            >
              <div key={uniqueId}>{attachment.data.filename}</div>
              {hasTag && isAttachmentUploaded(attachment) && (
                <div
                  className={classes.tag}
                  key={`attachment-summary-tag-${uniqueId}`}
                >
                  {attachment.data.tags && attachment.data.tags[0] && tryToGetTextResource(attachment.data.tags[0])}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
