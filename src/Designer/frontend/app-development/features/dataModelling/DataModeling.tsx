import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCenter,
  StudioError,
  StudioPageSpinner,
  StudioParagraph,
  StudioValidationMessage,
} from '@studio/components';
import { SchemaEditorWithToolbar } from './SchemaEditorWithToolbar';
import { useDataModelsJsonQuery, useDataModelsXsdQuery } from 'app-shared/hooks/queries';
import { useParams } from 'react-router-dom';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { mergeJsonAndXsdData } from '../../utils/metadataUtils';

interface DataModelingProps {
  createPathOption?: boolean;
}

export function DataModeling({ createPathOption = false }: DataModelingProps): ReactNode {
  const { t } = useTranslation();
  const { org, app } = useParams<{ org: string; app: string }>();
  const { status: jsonStatus, error: jsonError, data: jsonData } = useDataModelsJsonQuery(org, app);
  const { status: xsdStatus, error: xsdError, data: xsdData } = useDataModelsXsdQuery(org, app);

  switch (mergeQueryStatuses(jsonStatus, xsdStatus)) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('data_modeling.loading')} />;
    case 'error':
      return (
        <StudioCenter>
          <StudioError>
            <StudioParagraph>{t('general.fetch_error_message')}</StudioParagraph>
            <StudioParagraph>{t('general.error_message_with_colon')}</StudioParagraph>
            {jsonError && <StudioValidationMessage>{jsonError.message}</StudioValidationMessage>}
            {xsdError && <StudioValidationMessage>{xsdError.message}</StudioValidationMessage>}
          </StudioError>
        </StudioCenter>
      );
    case 'success': {
      const data = mergeJsonAndXsdData(jsonData, xsdData);
      return <SchemaEditorWithToolbar createPathOption={createPathOption} dataModels={data} />;
    }
  }
}
