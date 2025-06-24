import React from 'react';

import { AltinnCollapsibleAttachments } from 'src/components/molecules/AltinnCollapsibleAttachments';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IDisplayAttachment } from 'src/types/shared';

interface IRenderAttachmentGroupings {
  attachments: IDisplayAttachment[] | undefined;
  collapsibleTitle: React.ReactNode;
  hideCollapsibleCount?: boolean;
  showLinks: boolean | undefined;
  showDescription?: boolean;
}

const defaultGroupingKey = 'null';

export const AttachmentGroupings = ({
  attachments = [],
  collapsibleTitle,
  hideCollapsibleCount,
  showLinks = true,
  showDescription = false,
}: IRenderAttachmentGroupings) => {
  const langTools = useLanguage();

  const groupings = attachments?.reduce<Record<string, IDisplayAttachment[]>>((acc, attachment) => {
    const grouping = attachment.grouping ?? defaultGroupingKey;
    const translatedGrouping = langTools.langAsString(grouping);
    if (!acc[translatedGrouping]) {
      acc[translatedGrouping] = [];
    }
    acc[translatedGrouping].push(attachment);
    return acc;
  }, {});

  function sortDefaultGroupingFirst(a: string, b: string) {
    if (a === defaultGroupingKey) {
      return -1;
    }
    if (b === defaultGroupingKey) {
      return 1;
    }
    return 0;
  }

  if (!groupings) {
    return null;
  }

  return (
    <>
      {Object.keys(groupings)
        .sort(sortDefaultGroupingFirst)
        .map((groupTitle, index) => (
          <AltinnCollapsibleAttachments
            key={index}
            attachments={groupings[groupTitle]}
            title={groupTitle === 'null' ? collapsibleTitle : groupTitle}
            hideCount={hideCollapsibleCount}
            showLinks={showLinks}
            showDescription={showDescription}
          />
        ))}
    </>
  );
};
