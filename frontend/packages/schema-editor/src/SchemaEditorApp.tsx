import React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import { useDatamodelsMetadataQuery } from '@altinn/schema-editor/hooks/queries';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Center } from 'app-shared/components/Center';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import { PageSpinner } from 'app-shared/components';

export type SchemaEditorAppProps = {
  createPathOption?: boolean;
  displayLandingPage?: boolean;
}

export function SchemaEditorApp({
  createPathOption,
  displayLandingPage,
}: SchemaEditorAppProps) {
  const { status, error } = useDatamodelsMetadataQuery();
  const { t } = useTranslation();
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
        <Provider store={store}>
          <SchemaEditor
            createPathOption={createPathOption}
            displayLandingPage={displayLandingPage}
          />
        </Provider>
      );
  }
}
