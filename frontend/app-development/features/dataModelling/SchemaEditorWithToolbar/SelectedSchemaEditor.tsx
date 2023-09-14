import React from 'react';
import { useSchemaQuery } from '../../../hooks/queries';
import { useSchemaMutation } from '../../../hooks/mutations';
import { PageSpinner } from 'app-shared/components';
import { Center } from 'app-shared/components/Center';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { SchemaEditorApp } from '@altinn/schema-editor/SchemaEditorApp';
import { useTranslation } from 'react-i18next';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

export interface SelectedSchemaEditorProps {
  datamodels: DatamodelMetadata[];
  modelPath: string;
  modelName: string;
}

export const SelectedSchemaEditor = ({
  datamodels,
  modelPath,
  modelName,
}: SelectedSchemaEditorProps) => {
  const { data, status, error } = useSchemaQuery(modelPath);
  const { mutate } = useSchemaMutation();
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
        <SchemaEditorApp
          datamodels={datamodels}
          jsonSchema={data}
          save={mutate}
          modelName={modelName}
          modelPath={modelPath}
        />
      );
  }
};
