import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';

export type CodeListsPageProps = {};

export function CodeListsPage(): ReactElement {
  const { t } = useTranslation();
  return <StudioHeading>{t('app_content_library.code_lists.page_name')}</StudioHeading>;
}
