import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert } from '@studio/components';

export type UnknownComponentAlertProps = {
  componentName: string;
};
export const UnknownComponentAlert = ({
  componentName,
  ...rest
}: UnknownComponentAlertProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color='warning' {...rest}>
      {t('ux_editor.edit_component.unknown_component', {
        componentName,
      })}
    </StudioAlert>
  );
};
