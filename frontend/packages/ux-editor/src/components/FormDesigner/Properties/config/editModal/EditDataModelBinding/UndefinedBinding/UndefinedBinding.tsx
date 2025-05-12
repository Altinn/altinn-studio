import React from 'react';
import { StudioProperty } from '@studio/components-legacy';
import { LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

export type UndefinedBindingProps = {
  onClick: () => void;
  label: string;
};

export const UndefinedBinding = ({ onClick, label }: UndefinedBindingProps) => {
  const { t } = useTranslation();

  return (
    <StudioProperty.Button
      icon={<LinkIcon />}
      onClick={onClick}
      property={label}
      title={`${t('ux_editor.modal_properties_data_model_field_binding')} ${label}`}
    />
  );
};
