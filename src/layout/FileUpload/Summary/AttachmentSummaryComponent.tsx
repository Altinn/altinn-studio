import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent.module.css';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { getOptionLookupKey } from 'src/utils/options';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface IAttachmentSummaryComponent {
  targetNode: LayoutNodeFromType<'FileUpload'> | LayoutNodeFromType<'FileUploadWithTag'>;
}

export function AttachmentSummaryComponent({ targetNode }: IAttachmentSummaryComponent) {
  const attachments = useUploaderSummaryData(targetNode);
  const { lang, langAsString } = useLanguage();
  const component = targetNode.item;
  const hasTag = component.type === 'FileUploadWithTag';
  const options = useAppSelector((state) => {
    if (hasTag) {
      return state.optionState.options[
        getOptionLookupKey({
          id: component.optionsId,
          mapping: component.mapping,
        })
      ]?.options;
    } else {
      return undefined;
    }
  });

  const getOptionsTagLabel = ({ tags }: { tags: string[] }) =>
    options?.find((option) => option.value === tags[0])?.label;
  const tryToGetTextResource = (attachment) => {
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
            className={hasTag ? classes.row : ''}
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
