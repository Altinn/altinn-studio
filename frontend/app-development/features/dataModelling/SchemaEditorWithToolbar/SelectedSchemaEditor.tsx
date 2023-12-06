import React from 'react';
import { useSchemaQuery } from '../../../hooks/queries';
import { useSchemaMutation } from '../../../hooks/mutations';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { SchemaEditorApp } from '@altinn/schema-editor/SchemaEditorApp';
import { useTranslation } from 'react-i18next';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { SchemaEditor } from '@altinn/schema-editor/components/SchemaEditor';

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

  const render = () => {
    switch (status) {
      case 'pending':
        return <StudioPageSpinner />;

      case 'error':
        return (
          <StudioCenter>
            <Alert severity='danger'>
              <Paragraph>{t('general.fetch_error_message')}</Paragraph>
              <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
              <ErrorMessage>{error.message}</ErrorMessage>
            </Alert>
          </StudioCenter>
        );

      case 'success':
        return <SchemaEditor modelName={modelName} />;
    }
  };

  return (
    <SchemaEditorApp datamodels={datamodels} jsonSchema={data} save={mutate} modelPath={modelPath}>
      {render()}
    </SchemaEditorApp>
  );
};
