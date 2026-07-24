import type { JSX, ReactElement } from 'react';

import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import cn from 'classnames';

import classes from './AttachmentGroupings.module.css';
import { MainAttachmentHeader, SubAttachmentHeader } from './AttachmentHeader';
import { CollapsibleAttachments } from './CollapsibleAttachments';
import type { DisplayAttachment } from './types';

const defaultGroupingKey = 'null';

export type AttachmentGroupingsProps = {
  attachments: DisplayAttachment[] | undefined;
  title: ReactElement | undefined;
  hideCollapsibleCount?: boolean;
  showLinks?: boolean;
  showDescription?: boolean;
};

export function AttachmentGroupings({
  attachments = [],
  title,
  hideCollapsibleCount,
  showLinks = true,
  showDescription = false,
}: AttachmentGroupingsProps) {
  const { langAsString } = useTranslation();

  const groupings = attachments?.reduce<Record<string, DisplayAttachment[]>>((acc, attachment) => {
    const grouping = attachment.grouping ?? defaultGroupingKey;
    const translatedGrouping = langAsString(grouping);
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
              <CollapsibleAttachments
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
  groupings: Record<string, DisplayAttachment[]>;
  mainTitle: JSX.Element | undefined;
};

function GroupingTitle({
  groupTitle,
  hideCollapsibleCount,
  groupings,
  mainTitle,
}: GroupingTitleProps) {
  const numAttachmentsInGroup = hideCollapsibleCount
    ? ''
    : `(${groupings[groupTitle]?.length ?? 0})`;
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
