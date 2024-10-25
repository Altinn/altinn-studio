import React from 'react';
import { StudioButton, StudioCard, StudioNativeSelect, StudioTextfield } from '@studio/components';
import { ClipboardIcon, CheckmarkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './CreateNewSubform.module.css';

type CreateNewSubformProps = {
  onSaveClick: () => void;
  handleNameChange: (value: string) => void;
  onChangeDataModel: (value: string) => void;
  layoutSetName: string;
  dataModelValue: string;
};

export const CreateNewSubform = ({
  onSaveClick,
  handleNameChange,
  onChangeDataModel,
  layoutSetName,
  dataModelValue,
}: CreateNewSubformProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioCard>
      <StudioCard.Content>
        <StudioCard.Header>
          <ClipboardIcon />
        </StudioCard.Header>
        <StudioTextfield
          error={undefined}
          label={t('ux_editor.component_properties.subform.created_layout_set_name')}
          value={layoutSetName}
          size='sm'
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <StudioNativeSelect
          label={t('ux_editor.component_properties.subform.datamodell_binding_layout_set_name')}
          onChange={(e) => onChangeDataModel(e.target.value)}
          value={dataModelValue}
          size='sm'
        />
        <StudioButton
          className={classes.savelayoutSetButton}
          icon={<CheckmarkIcon />}
          onClick={onSaveClick}
          title={'Lagre'}
          variant='tertiary'
          color='success'
        />
      </StudioCard.Content>
    </StudioCard>
  );
};
