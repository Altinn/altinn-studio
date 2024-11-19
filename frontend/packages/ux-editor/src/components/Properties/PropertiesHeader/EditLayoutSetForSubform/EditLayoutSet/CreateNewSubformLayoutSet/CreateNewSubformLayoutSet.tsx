import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCard, StudioSpinner, StudioTextfield } from '@studio/components';
import { TrashIcon, CheckmarkIcon } from '@studio/icons';
import classes from './CreateNewSubformLayoutSet.module.css';
import { SubformDataModelSelect } from './SubformDataModelSelect';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useCreateSubform } from '@altinn/ux-editor/hooks/useCreateSubform';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { CreateNewDataModel } from './CreateNewDataModel';

type CreateNewSubformLayoutSetProps = {
  onUpdateLayoutSet: (layoutSetName: string) => void;
  layoutSets: LayoutSets;
  setShowCreateSubformCard: (showCreateSubform: boolean) => void;
  hasSubforms: boolean;
};

export const CreateNewSubformLayoutSet = ({
  onUpdateLayoutSet,
  layoutSets,
  setShowCreateSubformCard,
  hasSubforms,
}: CreateNewSubformLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [newSubform, setNewSubform] = useState('');
  const [selectedDataType, setSelectedDataType] = useState<string>();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { createSubform, isPendingLayoutSetMutation } = useCreateSubform();
  const [nameError, setNameError] = useState('');

  const [selectDisabled, setSelectDisabled] = useState(false);
  const [showNewDataModelInput, setShowNewDataModelInput] = useState(false);
  const [newDataModelName, setNewDataModelName] = useState('');

  function handleChange(subformName: string) {
    const subformNameValidation = validateLayoutSetName(subformName, layoutSets);
    setNameError(subformNameValidation);
    setNewSubform(subformName);
  }

  function handleCreateSubform() {
    createSubform({
      layoutSetName: newSubform,
      onSubformCreated: onUpdateLayoutSet,
      dataType: selectedDataType,
    });
  }

  function handleNewDataModelNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewDataModelName(e.target.value);
  }

  const handleClose = () => {
    if (selectDisabled) {
      setShowNewDataModelInput(false);
      setSelectDisabled(false);
      setNewDataModelName('');
    } else {
      setShowCreateSubformCard(false);
    }
  };

  const saveIcon = isPendingLayoutSetMutation ? (
    <StudioSpinner size='sm' spinnerTitle={t('general.loading')} />
  ) : (
    <CheckmarkIcon />
  );

  function handleNewDataModelClick() {
    setShowNewDataModelInput(true);
    setSelectDisabled(true);
  }

  function isSaveButtonDisabled(): boolean {
    if (showNewDataModelInput) return !newDataModelName;
    return !newSubform || !!nameError || !selectedDataType;
  }

  return (
    <StudioCard>
      <StudioCard.Content>
        <StudioTextfield
          label={t('ux_editor.component_properties.subform.created_layout_set_name')}
          value={newSubform}
          size='sm'
          disabled={isPendingLayoutSetMutation}
          onChange={(e) => handleChange(e.target.value)}
          error={nameError}
        />
        <SubformDataModelSelect
          selectedDataType={selectedDataType}
          setSelectedDataType={setSelectedDataType}
          disabled={selectDisabled}
        />
        <CreateNewDataModel
          showNewDataModelInput={showNewDataModelInput}
          newDataModelName={newDataModelName}
          onNewDataModelNameChange={handleNewDataModelNameChange}
          onNewDataModelClick={handleNewDataModelClick}
        />
        <div className={classes.buttonGroup}>
          <StudioButton
            icon={saveIcon}
            onClick={handleCreateSubform}
            title={t('general.save')}
            disabled={isSaveButtonDisabled()}
            variant='secondary'
            color='success'
          />
          {(hasSubforms || selectDisabled) && (
            <StudioButton
              onClick={handleClose}
              title={t('general.close')}
              icon={<TrashIcon />}
              variant='secondary'
              color='danger'
            />
          )}
        </div>
      </StudioCard.Content>
    </StudioCard>
  );
};
