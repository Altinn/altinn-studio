import classes from './SchemaGenerationErrorsPanel.module.css';
import React from 'react';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { XMarkIcon } from '@navikt/aksel-icons';
import { StudioButton } from '@studio/components';

export interface SchemaGenerationErrorsPanelProps {
  onCloseErrorsPanel: () => void;
  schemaGenerationErrorMessages: string[];
}

export const SchemaGenerationErrorsPanel = ({
  onCloseErrorsPanel,
  schemaGenerationErrorMessages,
}: SchemaGenerationErrorsPanelProps) => {
  const { t } = useTranslation();

  const API_ERROR_MESSAGE_COMPILER_NAME_COLLISION =
    'member names cannot be the same as their enclosing type';

  const isKnownErrorMessage = (errorMessage: string): boolean =>
    errorMessage.includes(API_ERROR_MESSAGE_COMPILER_NAME_COLLISION);

  const extractNodeNameFromError = (errorMessage: string): string =>
    errorMessage.match(/'([^']+)':/)?.[1];

  return (
    <Alert severity='danger'>
      <div className={classes.errorPanel}>
        <div>
          <Paragraph>{t('api_errors.DM_01')}</Paragraph>
          <ul>
            {schemaGenerationErrorMessages?.map((errorMessage, index) => {
              return (
                <li key={`${errorMessage}-${index}`}>
                  <ErrorMessage>
                    {isKnownErrorMessage(errorMessage) ? (
                      <Trans
                        i18nKey={'api_errors.DM_CsharpCompiler_NameCollision'}
                        values={{ nodeName: extractNodeNameFromError(errorMessage) }}
                        components={{ bold: <strong /> }}
                      />
                    ) : (
                      errorMessage
                    )}
                  </ErrorMessage>
                </li>
              );
            })}
          </ul>
        </div>
        <StudioButton
          color='danger'
          onClick={onCloseErrorsPanel}
          variant='tertiary'
          icon={<XMarkIcon aria-hidden />}
        >
          {t('general.close')}
        </StudioButton>
      </div>
    </Alert>
  );
};
