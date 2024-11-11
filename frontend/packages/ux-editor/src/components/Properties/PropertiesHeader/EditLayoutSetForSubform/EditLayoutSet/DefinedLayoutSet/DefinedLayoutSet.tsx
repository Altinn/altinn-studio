import React from 'react';
import { ClipboardIcon } from '@studio/icons';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './DefinedLayoutSet.module.css';

type DefinedLayoutSetProps = {
  existingLayoutSetForSubform: string;
};

export const DefinedLayoutSet = ({ existingLayoutSetForSubform }: DefinedLayoutSetProps) => {
  const { t } = useTranslation();

  return (
    <StudioProperty.Button
      className={classes.selectedLayoutSet}
      color='second'
      icon={<ClipboardIcon />}
      aria-label={t('ux_editor.component_properties.subform.selected_layout_set_title', {
        subform: existingLayoutSetForSubform,
      })}
      property={t('ux_editor.component_properties.subform.selected_layout_set_label')}
      title={t('ux_editor.component_properties.subform.selected_layout_set_title', {
        subform: existingLayoutSetForSubform,
      })}
      value={existingLayoutSetForSubform}
      readOnly={true}
    />
  );
};
