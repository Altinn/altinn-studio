import React, { type ReactElement } from 'react';
import { StudioToggleableTextfield } from 'libs/studio-components-legacy/src';
import { useGetDefaultUserControlledSigningInterfaceId } from './useGetDefaultUserControlledSigningInterfaceId';
import { useUpdateUserControlledImplementation } from './useUpdateUserControlledImplementation';
import { useTranslation } from 'react-i18next';

export const EditUserControlledImplementation = (): ReactElement => {
  const { t } = useTranslation();
  const defaultInterfaceId = useGetDefaultUserControlledSigningInterfaceId();
  const updateUserControlledImplementation = useUpdateUserControlledImplementation();
  return (
    <StudioToggleableTextfield
      onBlur={(event) => updateUserControlledImplementation(event.target.value)}
      label={t('process_editor.configuration_panel.edit_default_user_controlled_interface')}
      description={t(
        'process_editor.configuration_panel.edit_default_user_controlled_interface_description',
      )}
      defaultValue={defaultInterfaceId}
      icon={null}
    />
  );
};
