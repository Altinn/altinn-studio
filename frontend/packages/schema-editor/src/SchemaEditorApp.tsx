import React from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Center } from 'app-shared/components/Center';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import { PageSpinner } from 'app-shared/components';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';

export type SchemaEditorAppProps = {
  modelName?: string;
  modelPath: string;
}

export function SchemaEditorApp({ modelName, modelPath }: SchemaEditorAppProps) {
  return (
    <SchemaEditorAppContext.Provider value={{ modelPath }}>
      <SchemaEditorAppContent modelName={modelName} />
    </SchemaEditorAppContext.Provider>
  );
}

interface SchemaEditorAppContentProps {
  modelName?: string;
}

const SchemaEditorAppContent = ({ modelName }: SchemaEditorAppContentProps) => {
  const { status, error } = useDatamodelQuery();
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
          <SchemaEditor modelName={modelName}/>
        </Provider>
      );
  }
}
