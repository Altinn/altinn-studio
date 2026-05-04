import React, { useMemo } from 'react';
import { StudioButton, StudioTag } from '@studio/components';
import { PublishedElements } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export type PublishingProps = {
  className: string;
  codeListName: string;
  isPending: boolean;
  onPublish: () => void;
  publishedCodeLists: string[];
};

export function Publishing({
  className,
  codeListName,
  isPending,
  onPublish,
  publishedCodeLists,
}: PublishingProps): React.ReactNode {
  const publishedElements = useMemo(
    () => new PublishedElements(publishedCodeLists),
    [publishedCodeLists],
  );

  const canPublish = !!codeListName;
  const isPublished = publishedElements.isPublished(codeListName);
  const buttonText = useButtonText(isPublished, isPending);

  return (
    <div className={className}>
      <PublishedTag latestVersion={publishedElements.latestVersionOrNull(codeListName)} />
      <StudioButton
        disabled={!canPublish}
        loading={isPending}
        onClick={onPublish}
        variant='secondary'
      >
        {buttonText}
      </StudioButton>
    </div>
  );
}

function useButtonText(isPublished: boolean, isPublishing: boolean): string {
  const { t } = useTranslation();
  if (isPublishing) return t('app_content_library.code_lists.is_publishing');
  else if (isPublished) return t('app_content_library.code_lists.publish_new_version');
  else return t('app_content_library.code_lists.publish');
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
