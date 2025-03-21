import classes from './Variables.module.css';
import { PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { StudioButton } from '@studio/components-legacy';
import { InformationSquareFillIcon } from '@studio/icons';
import React, { useState } from 'react';
import type { TextResourceVariable } from './types';
import { useTranslation, Trans } from 'react-i18next';

export type VariablesProps = {
  variables: TextResourceVariable[];
};

export const Variables = ({ variables }: VariablesProps) => {
  const [infoboxOpen, setInfoboxOpen] = useState(false);
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
          <PopoverPanel
            title={'Kun for visning'}
            variant={PanelVariant.Info}
            trigger={<StudioButton icon={<InformationSquareFillIcon />} variant='tertiary' />}
            open={infoboxOpen}
            onOpenChange={setInfoboxOpen}
          >
            <div>{t('text_editor.variables_editing_not_supported')}</div>
          </PopoverPanel>
        </span>
      )}
    </div>
  );
};
