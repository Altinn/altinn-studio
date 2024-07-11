import React from 'react';
import type { AlertProps } from '@digdir/designsystemet-react';
import { Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export type UnknownComponentAlertProps = {
  componentName: string;
} & AlertProps;
export const UnknownComponentAlert = ({
  componentName,
  ...rest
}: UnknownComponentAlertProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Alert severity='warning' {...rest}>
      {t('ux_editor.edit_component.unknown_component', {
        componentName,
      })}
    </Alert>
  );
};
