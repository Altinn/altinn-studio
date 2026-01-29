import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioHeading } from '@studio/components';

export type SyncLoadingIndicatorProps = {
  heading: string;
};

export const SyncLoadingIndicator = ({
  heading,
}: SyncLoadingIndicatorProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      <StudioHeading spacing data-size='2xs' level={3}>
        {heading}
      </StudioHeading>
      <StudioSpinner aria-hidden spinnerTitle={t('sync_modal.loading')} />
    </>
  );
};
