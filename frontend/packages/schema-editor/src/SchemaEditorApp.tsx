import type { PropsWithChildren } from 'react';
import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import { SchemaEditorAppContext, SchemaEditorAppContextProps } from '@altinn/schema-editor/SchemaEditorAppContext';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Center } from 'app-shared/components/Center';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import type { QueryStatus } from '@tanstack/react-query';
import { ToolbarProps } from 'app-shared/features/dataModelling/components/Toolbar';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { GenerateSchemaState } from 'app-shared/types/global';
import { PageSpinner } from 'app-shared/components';

export type SchemaEditorAppProps = PropsWithChildren<{
  LandingPagePanel: ReactNode;
  editMode: boolean;
  loading?: boolean;
  modelPath: string;
  name?: string;
  onSaveSchema: (payload: JsonSchema) => void;
  schemaState: GenerateSchemaState;
  toggleEditMode: () => void;
  toolbarProps: Omit<ToolbarProps, 'disabled'>;
}>;

function WrappedContent({
  LandingPagePanel,
  editMode,
  loading,
  name,
  onSaveSchema,
  schemaState,
  toggleEditMode,
  toolbarProps,
}: Omit<SchemaEditorAppProps, keyof SchemaEditorAppContextProps>) {
  const { status: datamodelStatus, error: datamodelError } = useDatamodelQuery();
  const { t } = useTranslation();
  const status: QueryStatus = loading ? 'loading' : datamodelStatus;
  switch (status) {
    case 'loading':
      return <PageSpinner />;
    case 'error':
      return (
        <Center>
          <Alert severity='danger'>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            <ErrorMessage>{datamodelError.message}</ErrorMessage>
          </Alert>
        </Center>
      );
    case 'success':
      return (
        <Provider store={store}>
          <SchemaEditor
            LandingPagePanel={LandingPagePanel}
            editMode={editMode}
            name={name}
            schemaState={schemaState}
            onSaveSchema={onSaveSchema}
            toggleEditMode={toggleEditMode}
            toolbarProps={{ ...toolbarProps }}
          />
        </Provider>
      );
  }
}

export function SchemaEditorApp({ modelPath, ...other }: SchemaEditorAppProps) {
  return (
    <SchemaEditorAppContext.Provider value={{ modelPath }}>
      <WrappedContent {...other}/>
    </SchemaEditorAppContext.Provider>
  );
}
