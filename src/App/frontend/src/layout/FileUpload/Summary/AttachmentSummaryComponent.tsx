import React from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import classes from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { CompTypes } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

type ValidTypes = 'FileUpload' | 'FileUploadWithTag';

function isValidType(type: CompTypes): boolean {
  return type === 'FileUpload' || type === 'FileUploadWithTag';
}

export function AttachmentSummaryComponent({ targetBaseComponentId }: SummaryRendererProps) {
  const attachments = useUploaderSummaryData(targetBaseComponentId);
  const { langAsString } = useLanguage();
  const component = useItemWhenType<ValidTypes>(targetBaseComponentId, isValidType);
  const hasTag = component.type === 'FileUploadWithTag';

  const { options: allOptions } = useOptionsFor(targetBaseComponentId, 'single');
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
