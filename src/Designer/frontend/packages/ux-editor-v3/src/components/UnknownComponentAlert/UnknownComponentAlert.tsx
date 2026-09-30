import type { StudioAlertProps } from '@studio/components';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';

import type { JSX } from 'react';

export type UnknownComponentAlertProps = {
  componentName: string;
} & StudioAlertProps;
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
