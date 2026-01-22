import React, { useMemo } from 'react';
import { StudioButton, StudioTag } from '@studio/components';
import { PublishedElements } from '../../../../utils/PublishedElements/PublishedElements';
import { useTranslation } from 'react-i18next';

export type PublishingProps = {
  className: string;
  codeListName: string;
  onPublish: () => void;
  publishedCodeLists: string[];
};

export function Publishing({
  className,
  codeListName,
  onPublish,
  publishedCodeLists,
}: PublishingProps): React.ReactNode {
  const { t } = useTranslation();
  const publishedElements = useMemo(
    () => new PublishedElements(publishedCodeLists),
    [publishedCodeLists],
  );

  const canPublish = !!codeListName;
  const isPublished = publishedElements.isPublished(codeListName);
  const buttonText = isPublished
    ? t('app_content_library.code_lists.publish_new_version')
    : t('app_content_library.code_lists.publish');

  return (
    <div className={className}>
      <PublishedTag latestVersion={publishedElements.latestVersionOrNull(codeListName)} />
      <StudioButton onClick={onPublish} variant='secondary' disabled={!canPublish}>
        {buttonText}
      </StudioButton>
    </div>
  );
}

type PublishedTagProps = {
  latestVersion: number | null;
};

function PublishedTag({ latestVersion }: PublishedTagProps): React.ReactElement {
  const { t } = useTranslation();
  const text = latestVersion
    ? t('app_content_library.code_lists.latest_version', { version: latestVersion })
    : t('app_content_library.code_lists.unpublished');

  return <StudioTag>{text}</StudioTag>;
}
