import React from 'react';
import { StudioTextfield, StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

type CreateNewDataModelProps = {
  showNewDataModelInput: boolean;
  newDataModelName: string;
  onNewDataModelNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNewDataModelClick: () => void;
};

export const CreateNewDataModel = ({
  showNewDataModelInput,
  newDataModelName,
  onNewDataModelNameChange,
  onNewDataModelClick,
}: CreateNewDataModelProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      {showNewDataModelInput && (
        <StudioTextfield
          label={t('ux_editor.component_properties.subform.create_new_data_model_label')}
          value={newDataModelName}
          size='sm'
          onChange={onNewDataModelNameChange}
        />
      )}
      {!showNewDataModelInput && (
        <StudioProperty.Button
          icon={<LinkIcon />}
          onClick={onNewDataModelClick}
          property={t('ux_editor.component_properties.subform.create_new_data_model')}
        />
      )}
    </>
  );
};
