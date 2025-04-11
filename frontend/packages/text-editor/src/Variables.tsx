import classes from './Variables.module.css';
import { HelpText } from '@digdir/designsystemet-react';
import { StudioParagraph } from '@studio/components-legacy';
import React from 'react';
import type { TextResourceVariable } from './types';
import { useTranslation, Trans } from 'react-i18next';

export type VariablesProps = {
  variables: TextResourceVariable[];
};

export const Variables = ({ variables }: VariablesProps) => {
  const { t } = useTranslation();
  return (
    <div>
      {variables.map((variable) => (
        <div key={variable.key} className={classes.chip} title={variable.key}>
          <span className={classes.variables}>{`${variable.key}: ${variable.dataSource}`}</span>
          {variable.defaultValue && (
            <span className={classes.variables}>
              <Trans
                i18nKey={'text_editor.variables_default_value'}
                values={{ defaultValue: variable.defaultValue }}
                components={{ bold: <strong /> }}
              />
            </span>
          )}
        </div>
      ))}
      {variables.length > 0 && (
        <span
          className={classes.infoButton}
          title={t('text_editor.variables_editing_not_supported')}
        >
          <HelpText
            size='sm'
            placement='top'
            title={t('text_editor.variables_editing_not_supported_title')}
          >
            <StudioParagraph size='sm'>
              {t('text_editor.variables_editing_not_supported')}
            </StudioParagraph>
          </HelpText>
        </span>
      )}
    </div>
  );
};
