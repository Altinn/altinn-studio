import React from 'react';
import { StudioLinkButton, StudioTable } from 'libs/studio-components/src';
import { useTranslation } from 'react-i18next';

type VersionDialogTableRowProps = {
  devTypeLabel: string;
  latestVersion: number;
  link: {
    href: string;
    text: string;
  };
  currentVersion?: string;
};

export const VersionDialogTableRow = ({
  devTypeLabel,
  link,
  latestVersion,
  currentVersion,
}: VersionDialogTableRowProps) => {
  const { t } = useTranslation();

  return (
    <StudioTable.Row>
      <StudioTable.HeaderCell>{devTypeLabel}</StudioTable.HeaderCell>
      <StudioTable.Cell>
        {currentVersion ? `v${currentVersion}` : t('version_dialog.unknown')}
      </StudioTable.Cell>
      <StudioTable.Cell>v{latestVersion}</StudioTable.Cell>
      <StudioTable.Cell>
        <StudioLinkButton href={link.href}>{t(link.text, { latestVersion })}</StudioLinkButton>
      </StudioTable.Cell>
    </StudioTable.Row>
  );
};
