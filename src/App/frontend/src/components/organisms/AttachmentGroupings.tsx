import React from 'react';
import type { JSX } from 'react';

import cn from 'classnames';

import { MainAttachmentHeader, SubAttachmentHeader } from 'src/components/atoms/AttachmentHeader';
import { AltinnCollapsibleAttachments } from 'src/components/molecules/AltinnCollapsibleAttachments';
import classes from 'src/components/organisms/AttachmentGroupings.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IDisplayAttachment } from 'src/types/shared';

const defaultGroupingKey = 'null';

type AttachmentGroupingsProps = {
  attachments: IDisplayAttachment[] | undefined;
  title: JSX.Element | undefined;
  hideCollapsibleCount?: boolean;
  showLinks: boolean | undefined;
  showDescription?: boolean;
};

export function AttachmentGroupings({
  attachments = [],
  title,
  hideCollapsibleCount,
  showLinks = true,
  showDescription = false,
}: AttachmentGroupingsProps) {
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

  if (!Object.entries(groupings).length) {
    return title ? (
      <GroupingTitle
        groupTitle={defaultGroupingKey}
        hideCollapsibleCount={!!hideCollapsibleCount}
        groupings={groupings}
        mainTitle={title}
      />
    ) : null;
  }
  const attachmentsWithoutGrouping = groupings[defaultGroupingKey] ?? [];
  const hasAnyAttachmentsWithoutGrouping = attachmentsWithoutGrouping.length > 0;

  return (
    <>
      {!hasAnyAttachmentsWithoutGrouping && title && (
        <GroupingTitle
          groupTitle={defaultGroupingKey}
          hideCollapsibleCount={!!hideCollapsibleCount}
          groupings={groupings}
          mainTitle={title}
        />
      )}
      <ul className={classes.groupList}>
        {Object.keys(groupings)
          .sort(sortDefaultGroupingFirst)
          .map((groupTitle) => (
            <li key={groupTitle}>
              <AltinnCollapsibleAttachments
                attachments={groupings[groupTitle]}
                title={
                  <GroupingTitle
                    groupTitle={groupTitle}
                    hideCollapsibleCount={!!hideCollapsibleCount}
                    groupings={groupings}
                    mainTitle={title}
                  />
                }
                showLinks={showLinks}
                showDescription={showDescription}
              />
            </li>
          ))}
      </ul>
    </>
  );
}

type GroupingTitleProps = {
  groupTitle: string;
  hideCollapsibleCount: boolean;
  groupings: Record<string, IDisplayAttachment[]>;
  mainTitle: JSX.Element | undefined;
};

function GroupingTitle({ groupTitle, hideCollapsibleCount, groupings, mainTitle }: GroupingTitleProps) {
  const numAttachmentsInGroup = hideCollapsibleCount ? '' : `(${groupings[groupTitle]?.length ?? 0})`;
  const attachmentsWithoutGrouping = groupings[defaultGroupingKey] ?? [];
  const hasAnyAttachmentsWithoutGrouping = attachmentsWithoutGrouping.length > 0;

  if (groupTitle === defaultGroupingKey) {
    return (
      <MainAttachmentHeader
        title={
          <>
            {mainTitle}&nbsp;{numAttachmentsInGroup}
          </>
        }
        className={cn({ [classes.paddingBottom]: !hasAnyAttachmentsWithoutGrouping })}
      />
    );
  }

  return (
    <SubAttachmentHeader
      title={
        <>
          {groupTitle}&nbsp;{numAttachmentsInGroup}
        </>
      }
    />
  );
}

function sortDefaultGroupingFirst(a: string, b: string) {
  if (a === defaultGroupingKey) {
    return -1;
  }
  if (b === defaultGroupingKey) {
    return 1;
  }
  return 0;
}
