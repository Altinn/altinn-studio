import React, { useState } from 'react';
import {
  StudioCard,
  StudioTextfield,
  StudioTabs,
  StudioNativeSelect,
  StudioSpinner,
} from '@studio/components-legacy';
import { StudioButton, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './CreateSubformMode.module.css';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useAppMetadataQuery } from 'app-shared/hooks/queries/useAppMetadataQuery';
import { useValidateSchemaName } from 'app-shared/hooks/useValidateSchemaName';
import { extractDataTypeNamesFromAppMetadata } from 'app-development/features/dataModelling/SchemaEditorWithToolbar/TopToolbar/utils/validationUtils';
import {
  isSaveButtonDisabled,
  RenderDataModelOptions,
  type NewSubformProps,
} from './AddSubformCardUtils';
import { useCreateSubform } from '@altinn/ux-editor/hooks/useCreateSubform';

enum Tabs {
  Choose = 'choose',
  Create = 'create',
}

export type CreateSubformModeProps = {
  setIsCreateSubformMode: (isSubformInEditMode: boolean) => void;
};

export const CreateSubformMode = ({
  setIsCreateSubformMode,
}: CreateSubformModeProps): React.ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { data: dataModelIds } = useAppMetadataModelIdsQuery(org, app, false);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const dataTypeNames = extractDataTypeNamesFromAppMetadata(appMetadata);
  const {
    validateName: validateDataModelName,
    nameError: dataModelError,
    setNameError: setDataModelError,
  } = useValidateSchemaName(dataModelIds, dataTypeNames);
  const { createSubform, isPendingNewSubformMutation } = useCreateSubform();

  const [newSubform, setNewSubform] = useState<NewSubformProps>({
    subformName: '',
    dataModelName: '',
  });
  const [subformError, setSubformError] = useState('');

  const handleSubformName = (newSubformName: string) => {
    setNewSubform((prevState) => ({
      ...prevState,
      subformName: newSubformName,
    }));
    setSubformError(validateLayoutSetName(newSubformName, layoutSets));
  };

  const handleDataModelName = (dataModelId: string, isNewDataModel: boolean = false) => {
    setNewSubform((prevState) => ({
      ...prevState,
      dataModelName: dataModelId,
    }));

    if (isNewDataModel) {
      validateDataModelName(dataModelId);
    }
  };

  const handleChangeTab = () => {
    setNewSubform((prevState) => ({
      ...prevState,
      dataModelName: '',
    }));
    setDataModelError('');
  };

  const handleCreateNewSubform = () => {
    createSubform({
      layoutSetName: newSubform.subformName,
      onSubformCreated: () => setIsCreateSubformMode(false),
      dataType: newSubform.dataModelName,
      newDataModel: !dataModelIds?.includes(newSubform.dataModelName),
    });
  };

  const saveButtonIcon = isPendingNewSubformMutation ? (
    <StudioSpinner size='sm' spinnerTitle={t('general.loading')} />
  ) : (
    <CheckmarkIcon />
  );

  const disableSaveButton = isSaveButtonDisabled({
    newSubform,
    subformError,
    dataModelError,
    isPendingNewSubformMutation,
  });

  return (
    <StudioCard className={classes.subformCardEditMode}>
      <StudioParagraph data-size='xs'>{t('ux_editor.subform')}</StudioParagraph>
      <StudioTextfield
        label={t('ux_editor.task_card.subform_name_label')}
        error={subformError}
        className={classes.textField}
        onChange={(e) => handleSubformName(e.target.value)}
      />
      <StudioTabs
        size='sm'
        defaultValue={Tabs.Choose}
        className={classes.subformTabs}
        onChange={handleChangeTab}
      >
        <StudioTabs.List>
          <StudioTabs.Tab value={Tabs.Choose}>{t('general.select')}</StudioTabs.Tab>
          <StudioTabs.Tab value={Tabs.Create}>{t('general.create_new')}</StudioTabs.Tab>
        </StudioTabs.List>
        <StudioTabs.Content value={Tabs.Choose} className={classes.tabContent}>
          <StudioNativeSelect
            label={t('ux_editor.task_card.select_data_model')}
            size='sm'
            onChange={(e) => handleDataModelName(e.target.value)}
          >
            {RenderDataModelOptions(dataModelIds)}
          </StudioNativeSelect>
        </StudioTabs.Content>
        <StudioTabs.Content value={Tabs.Create} className={classes.tabContent}>
          <StudioTextfield
            label={t('ux_editor.task_card.new_data_model')}
            value={newSubform.dataModelName}
            className={classes.textField}
            onChange={(e) => handleDataModelName(e.target.value, true)}
            error={dataModelError}
          />
        </StudioTabs.Content>
      </StudioTabs>
      <div className={classes.buttonContainer}>
        <StudioButton
          disabled={disableSaveButton}
          icon={saveButtonIcon}
          onClick={handleCreateNewSubform}
        >
          {t('general.save')}
        </StudioButton>
        <StudioButton
          variant='secondary'
          icon={<XMarkIcon />}
          onClick={() => setIsCreateSubformMode(false)}
        >
          {t('general.cancel')}
        </StudioButton>
      </div>
    </StudioCard>
  );
};
