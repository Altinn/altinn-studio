import React, { useState } from 'react';
import {
  StudioCard,
  StudioTextfield,
  StudioTabs,
  StudioNativeSelect,
} from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
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
import { isSaveButtonDisabled, type NewSubformProps } from './AddSubformCardUtils';

enum Tabs {
  Choose = 'choose',
  Create = 'create',
}

type SubformCardEditModeProps = {
  setIsCreateSubformMode: (isSubformInEditMode: boolean) => void;
};

export const SubformCardEditMode = ({ setIsCreateSubformMode }: SubformCardEditModeProps) => {
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

  const handleNewDataModelName = (dataModelId: string) => {
    setNewSubform((prevState) => ({
      ...prevState,
      dataModelName: dataModelId,
    }));
    validateDataModelName(dataModelId);
  };

  const handleSelectDataModelChange = (dataModelId: string) => {
    setNewSubform((prevState) => ({
      ...prevState,
      dataModelName: dataModelId,
    }));
  };
  const handleChangeTab = () => {
    setNewSubform((prevState) => ({
      ...prevState,
      dataModelName: '',
    }));
    setDataModelError('');
  };

  return (
    <StudioCard className={classes.subformCardEditMode}>
      <StudioCard.Header data-size='xs'>{t('ux_editor.subform')}</StudioCard.Header>
      <StudioTextfield
        label={t('ux_editor.component_properties.subform.created_layout_set_name')}
        size='small'
        error={subformError}
        className={classes.textField}
        onChange={(e) => handleSubformName(e.target.value)}
      />
      <StudioTabs
        defaultValue={Tabs.Choose}
        className={classes.subformTabs}
        onChange={handleChangeTab}
      >
        <StudioTabs.List>
          <StudioTabs.Tab value={Tabs.Choose}>Velg</StudioTabs.Tab>
          <StudioTabs.Tab value={Tabs.Create}>Lag ny</StudioTabs.Tab>
        </StudioTabs.List>
        <StudioTabs.Content value={Tabs.Choose} className={classes.tabContent}>
          <StudioNativeSelect
            label={t('ux_editor.component_properties.subform.data_model_binding_label')}
            size='small'
            onChange={(e) => handleSelectDataModelChange(e.target.value)}
          >
            <option value='' hidden />
            {dataModelIds ? (
              dataModelIds.map((dataModelId) => (
                <option value={dataModelId} key={dataModelId}>
                  {dataModelId}
                </option>
              ))
            ) : (
              <option value=''>
                {t('ux_editor.component_properties.subform.data_model_empty_messsage')}
              </option>
            )}
          </StudioNativeSelect>
        </StudioTabs.Content>
        <StudioTabs.Content value={Tabs.Create} className={classes.tabContent}>
          <StudioTextfield
            label={'Navn på datamodell'}
            size='small'
            value={newSubform.dataModelName}
            className={classes.textField}
            onChange={(e) => handleNewDataModelName(e.target.value)}
            error={dataModelError}
          />
        </StudioTabs.Content>
      </StudioTabs>
      <div className={classes.buttonContainer}>
        <StudioButton
          disabled={isSaveButtonDisabled({ newSubform, subformError, dataModelError })}
          className={classes.button}
          icon={<CheckmarkIcon />}
          onClick={() => setIsCreateSubformMode(false)}
        >
          {t('general.save')}
        </StudioButton>
        <StudioButton
          variant='secondary'
          className={classes.button}
          icon={<XMarkIcon />}
          onClick={() => setIsCreateSubformMode(false)}
        >
          {t('general.cancel')}
        </StudioButton>
      </div>
    </StudioCard>
  );
};
