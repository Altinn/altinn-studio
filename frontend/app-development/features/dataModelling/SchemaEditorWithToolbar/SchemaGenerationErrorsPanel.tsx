import classes from './SchemaGenerationErrorsPanel.module.css';
import React from 'react';
import { Alert, Button, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';
import { XMarkIcon } from '@navikt/aksel-icons';

export interface SchemaGenerationErrorsPanelProps {
  onCloseErrorsPanel: () => void;
  schemaGenerationErrorMessages: string[];
}

export const SchemaGenerationErrorsPanel = ({
  onCloseErrorsPanel,
  schemaGenerationErrorMessages,
}: SchemaGenerationErrorsPanelProps) => {
  const { t } = useTranslation();

  return (
    <Alert severity='danger' className={classes.errorPanel}>
      <div>
        <Paragraph>{t('api_errors.DM_01')}</Paragraph>
        <ul>
          {schemaGenerationErrorMessages?.map((errorMessage, index) => {
            return (
              <li key={index}>
                <ErrorMessage>
                  {errorMessage.includes(
                    'member names cannot be the same as their enclosing type',
                  ) ? (
                    <Trans
                      i18nKey={'api_errors.DM_CsharpCompiler_NameCollision'}
                      values={{ nodeName: errorMessage.match(/'([^']+)':/)?.[1] }}
                      components={{ bold: <strong /> }}
                    />
                  ) : (
                    <>{errorMessage}</>
                  )}
                </ErrorMessage>
              </li>
            );
          })}
        </ul>
      </div>
      <Button
        color='danger'
        open={schemaGenerationErrorMessages.length > 0}
        onClick={onCloseErrorsPanel}
        variant='tertiary'
        icon={<XMarkIcon />}
      >
        {t('general.close')}
      </Button>
    </Alert>
  );
};
