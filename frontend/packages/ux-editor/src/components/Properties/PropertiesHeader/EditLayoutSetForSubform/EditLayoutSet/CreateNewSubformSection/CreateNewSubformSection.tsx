import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCard,
  StudioRecommendedNextAction,
  StudioTextfield,
} from '@studio/components-legacy';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { SubformDataModel } from './SubformDataModel';
import { CreateNewSubformButtons } from './CreateNewSubformButtons';
import { SubformInstructions } from './SubformInstructions';
import { useCreateSubform } from '@altinn/ux-editor/hooks/useCreateSubform';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { extractDataTypeNamesFromAppMetadata } from 'app-development/features/dataModelling/SchemaEditorWithToolbar/TopToolbar/utils/validationUtils';
import { useValidateSchemaName } from 'app-shared/hooks/useValidateSchemaName';

type CreateNewSubformSectionProps = {
  layoutSets: LayoutSets;
  setShowCreateSubformCard: (showCreateSubform: boolean) => void;
  hasSubforms: boolean;
  recommendedNextActionText: {
    title: string;
    description: string;
  };
  onComponentUpdate: (subform: string) => void;
};

export const CreateNewSubformSection = ({
  layoutSets,
  setShowCreateSubformCard,
  hasSubforms,
  recommendedNextActionText: { title, description },
  onComponentUpdate,
}: CreateNewSubformSectionProps): React.ReactElement => {
  const { t } = useTranslation();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const [newSubformNameError, setNewSubformNameError] = useState<string>();
  const [selectedDataModel, setSelectedDataModel] = useState<string>('');
  const [displayDataModelInput, setDisplayDataModelInput] = useState(false);
  const { createSubform, isPendingNewSubformMutation } = useCreateSubform();
  const [isNewDataModelFieldEmpty, setIsNewDataModelFieldEmpty] = useState(true);

  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModelIds } = useAppMetadataModelIdsQuery(org, app, false);
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const dataTypeNames = extractDataTypeNamesFromAppMetadata(appMetadata);
  const {
    validateName,
    nameError: dataModelNameError,
    setNameError: setDataModelNameError,
  } = useValidateSchemaName(dataModelIds, dataTypeNames);

  const handleSubformName = (subformName: string) => {
    const subformNameValidation = validateLayoutSetName(subformName, layoutSets);
    setNewSubformNameError(subformNameValidation);
  };

  const handleCloseButton = () => {
    if (displayDataModelInput) {
      setDataModelNameError('');
      setIsNewDataModelFieldEmpty(true);
      setDisplayDataModelInput(false);
    } else {
      setShowCreateSubformCard(false);
    }
  };
  const handleCreateSubformSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const formData: FormData = new FormData(e.currentTarget);
    const newSubformName = formData.get('subform') as string;
    const subformDataType = formData.get('subformDataModel') as string;
    const newSubformDataType = formData.get('newSubformDataModel') as string;

    createSubform({
      layoutSetName: newSubformName,
      onSubformCreated: onComponentUpdate,
      dataType: subformDataType || newSubformDataType,
      newDataModel: !!newSubformDataType,
    });
  };

  const hasInvalidSubformName = newSubformNameError === undefined || Boolean(newSubformNameError);
  const hasInvalidDataModel = displayDataModelInput
    ? Boolean(dataModelNameError) || isNewDataModelFieldEmpty
    : !selectedDataModel;
  const disableSaveButton = hasInvalidSubformName || hasInvalidDataModel;

  return (
    <StudioRecommendedNextAction
      title={t(title)}
      description={t(description)}
      hideSaveButton={true}
      hideSkipButton={true}
      onSave={handleCreateSubformSubmit}
    >
      {!hasSubforms && <SubformInstructions />}
      <StudioCard>
        <StudioCard.Content>
          <StudioTextfield
            name='subform'
            label={t('ux_editor.component_properties.subform.created_layout_set_name')}
            disabled={isPendingNewSubformMutation}
            onChange={(e) => handleSubformName(e.target.value)}
            error={newSubformNameError}
          />
          <SubformDataModel
            setDisplayDataModelInput={setDisplayDataModelInput}
            displayDataModelInput={displayDataModelInput}
            setSelectedDataModel={setSelectedDataModel}
            dataModelIds={dataModelIds}
            validateName={validateName}
            dataModelNameError={dataModelNameError}
            setIsTextfieldEmpty={setIsNewDataModelFieldEmpty}
          />
          <CreateNewSubformButtons
            isPendingNewSubformMutation={isPendingNewSubformMutation}
            disableSaveButton={disableSaveButton}
            displayCloseButton={hasSubforms || displayDataModelInput}
            handleCloseButton={handleCloseButton}
          />
        </StudioCard.Content>
      </StudioCard>
    </StudioRecommendedNextAction>
  );
};
