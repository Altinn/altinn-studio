import React from 'react';
import { Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components-legacy';

export type SyncLoadingIndicatorProps = {
  heading: string;
};

export const SyncLoadingIndicator = ({
  heading,
}: SyncLoadingIndicatorProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      <Heading size='xxsmall' spacing level={3}>
        {heading}
      </Heading>
      <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('sync_modal.loading')} />
    </>
  );
};
