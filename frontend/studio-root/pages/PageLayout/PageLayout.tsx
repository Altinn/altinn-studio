import React from 'react';
import { Outlet } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components-legacy/';
import { useTranslation } from 'react-i18next';

export const PageLayout = () => {
  const { t } = useTranslation();

  return (
    <>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left title={t('general.back')} showTitle={false} />
        </StudioPageHeader.Main>
      </StudioPageHeader>
      <Outlet />
    </>
  );
};
