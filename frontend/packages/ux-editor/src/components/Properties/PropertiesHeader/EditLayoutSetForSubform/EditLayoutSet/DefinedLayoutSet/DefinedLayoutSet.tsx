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

  const value = (
    <span className={classes.selectedLayoutSet}>
      <ClipboardIcon /> <span>{existingLayoutSetForSubform}</span>
    </span>
  );

  return (
    <StudioProperty.Button
      aria-label={t('ux_editor.component_properties.subform.selected_layout_set_title', {
        subform: existingLayoutSetForSubform,
      })}
      property={t('ux_editor.component_properties.subform.selected_layout_set_label')}
      title={t('ux_editor.component_properties.subform.selected_layout_set_title', {
        subform: existingLayoutSetForSubform,
      })}
      value={value}
      readOnly={true}
    />
  );
};
