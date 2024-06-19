import React from 'react';
import { Heading } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';

export type FetchingFromGiteaProps = {
  heading: string;
};

export const FetchingFromGitea = ({ heading }: FetchingFromGiteaProps): React.ReactElement => {
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
