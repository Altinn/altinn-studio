import React from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAllOptions } from 'src/features/options/useAllOptions';
import classes from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IAttachmentSummaryComponent {
  targetNode: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
}

export function AttachmentSummaryComponent({ targetNode }: IAttachmentSummaryComponent) {
  const attachments = useUploaderSummaryData(targetNode);
  const { lang, langAsString } = useLanguage();
  const component = targetNode.item;
  const allOptions = useAllOptions();
  const hasTag = component.type === 'FileUploadWithTag';
  const options = hasTag ? allOptions[component.id] : undefined;

  const tryToGetTextResource = (tag: string) => {
    const label = options?.find((option) => option.value === tag)?.label;
    return langAsString(label);
  };

  return (
    <div data-testid={`${hasTag ? 'attachment-with-tag-summary' : 'attachment-summary-component'}`}>
      {attachments.length === 0 ? (
        <div className={classes.emptyField}>{lang('general.empty_summary')}</div>
      ) : (
        attachments.map((attachment) => {
          const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;
          return (
            <div
              className={hasTag ? classes.row : classes.data}
              key={`attachment-summary-${uniqueId}`}
            >
              <div key={uniqueId}>{attachment.data.filename}</div>
              {hasTag && isAttachmentUploaded(attachment) && (
                <div key={`attachment-summary-tag-${uniqueId}`}>
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
