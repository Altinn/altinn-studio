import React from 'react';
import { LinkIcon } from '@studio/icons';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';

type DefinedLayoutSetProps = {
  existingLayoutSetForSubForm: string;
  onClick: () => void;
};

export const DefinedLayoutSet = ({
  existingLayoutSetForSubForm,
  onClick,
}: DefinedLayoutSetProps) => {
  const { t } = useTranslation();

  const value = (
    <span>
      <LinkIcon /> <span>{existingLayoutSetForSubForm}</span>
    </span>
  );

  return (
    <StudioProperty.Button
      aria-label={t('ux_editor.component_properties.subform.selected_layout_set')}
      onClick={onClick}
      property={t('ux_editor.component_properties.subform.selected_layout_set')}
      title={t('ux_editor.component_properties.subform.selected_layout_set')}
      value={value}
    />
  );
};
