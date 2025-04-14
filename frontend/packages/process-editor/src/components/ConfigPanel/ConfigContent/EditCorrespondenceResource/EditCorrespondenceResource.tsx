import React from 'react';
import { StudioToggleableTextfield } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useGetCorrespondenceResource } from './useGetCorrespondenceResource';
import { useUpdateCorrespondenceResource } from './useUpdateCorrespondenceResource';

export const EditCorrespondenceResource = () => {
  const { t } = useTranslation();
  const updateCorrespondenceResource = useUpdateCorrespondenceResource();
  const defaultCorrespondenceResource = useGetCorrespondenceResource();

  const saveCorrespondenceResource = (correspondenceResource: string): void => {
    updateCorrespondenceResource(correspondenceResource);
  };

  return (
    <StudioToggleableTextfield
      onBlur={(event) => saveCorrespondenceResource(event.target.value)}
      label={t('process_editor.configuration_panel.correspondence_resource')}
      description={t('process_editor.configuration_panel.correspondence_resource_description')}
      defaultValue={defaultCorrespondenceResource}
      icon={null}
    />
  );
};
