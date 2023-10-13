import React from 'react';

import { useAllOptions } from 'src/features/options/useAllOptions';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import type { IAttachment } from 'src/features/attachments';
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

  const getOptionsTagLabel = ({ tags }: { tags?: string[] }) =>
    options?.find((option) => option.value === (tags && tags[0]))?.label;
  const tryToGetTextResource = (attachment: IAttachment) => {
    const optionsTagLabel = getOptionsTagLabel(attachment);
    return langAsString(optionsTagLabel);
  };

  return (
    <div data-testid={`${hasTag ? 'attachment-with-tag-summary' : 'attachment-summary-component'}`}>
      {attachments.length === 0 ? (
        <div className={classes.emptyField}>{lang('general.empty_summary')}</div>
      ) : (
        attachments.map((attachment) => (
          <div
            className={hasTag ? classes.row : classes.data}
            key={`attachment-summary-${attachment.id}`}
          >
            <div key={attachment.id}>{attachment.name}</div>
            {hasTag && (
              <div key={`attachment-summary-tag-${attachment.id}`}>
                {attachment.tags && attachment.tags[0] && tryToGetTextResource(attachment)}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
