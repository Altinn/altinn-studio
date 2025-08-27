import React, { type ReactElement } from 'react';
import { StudioToggleableTextfield } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { useGetCorrespondenceResource } from './useGetCorrespondenceResource';
import { useUpdateCorrespondenceResource } from './useUpdateCorrespondenceResource';

export const EditCorrespondenceResource = (): ReactElement => {
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
