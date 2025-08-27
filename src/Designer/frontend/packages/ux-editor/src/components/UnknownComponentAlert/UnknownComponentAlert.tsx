import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert } from 'libs/studio-components/src';

export type UnknownComponentAlertProps = {
  componentName: string;
};
export const UnknownComponentAlert = ({
  componentName,
}: UnknownComponentAlertProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color='warning'>
      {t('ux_editor.edit_component.unknown_component', {
        componentName,
      })}
    </StudioAlert>
  );
};
