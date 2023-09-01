import React, { ReactNode } from 'react';
import { useDatamodelsMetadataQuery } from '../../hooks/queries';
import { useTranslation } from 'react-i18next';
import { PageSpinner } from 'app-shared/components';
import { Center } from 'app-shared/components/Center';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { SchemaEditorWithToolbar } from './SchemaEditorWithToolbar';

interface DataModellingProps {
  createPathOption?: boolean;
}

export function DataModelling({
  createPathOption = false,
}: DataModellingProps): ReactNode {
  const { t } = useTranslation();
  const { status, error, data } = useDatamodelsMetadataQuery();

  switch (status) {
    case 'loading':
      return <PageSpinner />;
    case 'error':
      return (
        <Center>
          <Alert severity='danger'>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            <ErrorMessage>{error.message}</ErrorMessage>
          </Alert>
        </Center>
      );
    case 'success':
      return (
        <SchemaEditorWithToolbar
          createPathOption={createPathOption}
          displayLandingPage={!data?.length}
        />
      );
  }
}
