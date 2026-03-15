import React, { type ReactElement } from 'react';
import { StudioToggleableTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useGetCorrespondenceResource } from './useGetCorrespondenceResource';
import { useUpdateCorrespondenceResource } from './useUpdateCorrespondenceResource';

export type EditCorrespondenceResourceProps = {
  isUserControlledSigningTask?: boolean;
};

export const EditCorrespondenceResource = ({
  isUserControlledSigningTask,
}: EditCorrespondenceResourceProps): ReactElement => {
  const { t } = useTranslation();
  const updateCorrespondenceResource = useUpdateCorrespondenceResource();
  const defaultCorrespondenceResource = useGetCorrespondenceResource();

  const saveCorrespondenceResource = (correspondenceResource: string): void => {
    updateCorrespondenceResource(correspondenceResource);
  };

  const label = isUserControlledSigningTask
    ? t('process_editor.configuration_panel.correspondence_resource_user_controlled_signing')
    : t('process_editor.configuration_panel.correspondence_resource');

  const description = isUserControlledSigningTask
    ? t(
        'process_editor.configuration_panel.correspondence_resource_user_controlled_signing_description',
      )
    : t('process_editor.configuration_panel.correspondence_resource_description');

  return (
    <StudioToggleableTextfield
      onBlur={(event) => saveCorrespondenceResource(event.target.value)}
      label={label}
      description={description}
      defaultValue={defaultCorrespondenceResource}
      icon={null}
    />
  );
};
