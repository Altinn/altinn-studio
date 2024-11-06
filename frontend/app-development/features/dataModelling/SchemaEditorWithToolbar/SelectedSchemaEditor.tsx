import React from 'react';
import { useSchemaQuery } from '../../../hooks/queries';
import { StudioCenter, StudioError, StudioPageSpinner } from '@studio/components';
import { ErrorMessage, Paragraph } from '@digdir/designsystemet-react';
import { SchemaEditorApp } from '@altinn/schema-editor/SchemaEditorApp';
import { useTranslation } from 'react-i18next';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useSaveSchemaWithDebounce } from './useSaveSchemaWithDebounce';

export interface SelectedSchemaEditorProps {
  modelPath: string;
}

export const SelectedSchemaEditor = ({ modelPath }: SelectedSchemaEditorProps) => {
  const { data, status, error } = useSchemaQuery(modelPath);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('schema_editor.loading_page')} />;

    case 'error':
      return (
        <StudioCenter>
          <StudioError>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            <ErrorMessage>
              {error.response?.data?.customErrorMessages[0] ?? error.message}
            </ErrorMessage>
          </StudioError>
        </StudioCenter>
      );

    case 'success':
      return <SchemaEditorWithDebounce jsonSchema={data} modelPath={modelPath} key={modelPath} />;
  }
};

interface SchemaEditorWithDebounceProps {
  jsonSchema: JsonSchema;
  modelPath: string;
}

const SchemaEditorWithDebounce = ({ jsonSchema, modelPath }: SchemaEditorWithDebounceProps) => {
  const { model, saveSchema } = useSaveSchemaWithDebounce(jsonSchema, modelPath);

  return <SchemaEditorApp jsonSchema={model} save={saveSchema} />;
};
