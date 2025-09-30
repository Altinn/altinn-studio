import type { ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioPageSpinner, StudioError } from '@studio/components-legacy';
import { StudioCenter } from '@studio/components';
import { ErrorMessage, Paragraph } from '@digdir/designsystemet-react';
import { SchemaEditorWithToolbar } from './SchemaEditorWithToolbar';
import { useDataModelsJsonQuery, useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { useParams } from 'react-router-dom';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { mergeJsonAndXsdData } from '../../utils/metadataUtils';

interface DataModellingProps {
  createPathOption?: boolean;
}

export function DataModelling({ createPathOption = false }: DataModellingProps): ReactNode {
  const { t } = useTranslation();
  const { org, app } = useParams<{ org: string; app: string }>();
  const { status: jsonStatus, error: jsonError, data: jsonData } = useDataModelsJsonQuery(org, app);
  const { status: xsdStatus, error: xsdError, data: xsdData } = useDataModelsXsdQuery(org, app);

  switch (mergeQueryStatuses(jsonStatus, xsdStatus)) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('data_modelling.loading')} />;
    case 'error':
      return (
        <StudioCenter>
          <StudioError>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            {jsonError && <ErrorMessage>{jsonError.message}</ErrorMessage>}
            {xsdError && <ErrorMessage>{xsdError.message}</ErrorMessage>}
          </StudioError>
        </StudioCenter>
      );
    case 'success': {
      const data = mergeJsonAndXsdData(jsonData, xsdData);
      return <SchemaEditorWithToolbar createPathOption={createPathOption} dataModels={data} />;
    }
  }
}
