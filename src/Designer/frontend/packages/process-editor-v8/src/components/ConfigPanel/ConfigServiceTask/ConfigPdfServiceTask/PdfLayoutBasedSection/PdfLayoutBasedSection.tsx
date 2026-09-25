import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  StudioButton,
  StudioCard,
  StudioSuggestion,
  StudioTextfield,
  type StudioSuggestionItem,
} from '@studio/components';
import { PencilIcon } from '@studio/icons';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useCurrentLayoutSet } from '../useCurrentLayoutSet';
import classes from './PdfLayoutBasedSection.module.css';

export const PdfLayoutBasedSection = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails } = useBpmnContext();
  const { addLayoutSet, layoutSets, allDataModelIds = [] } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { currentLayoutSet } = useCurrentLayoutSet();

  const [newLayoutSetName, setNewLayoutSetName] = useState('');
  const [newLayoutSetNameError, setNewLayoutSetNameError] = useState('');
  const [selectedDataModelId, setSelectedDataModelId] = useState<string>('');

  if (currentLayoutSet) {
    return (
      <div>
        <StudioButton
          onClick={() => navigate(`/${org}/${app}/ui-editor/layoutSet/${currentLayoutSet.id}`)}
          icon={<PencilIcon />}
        >
          {t('process_editor.configuration_panel_pdf_layout_set_link')}
        </StudioButton>
      </div>
    );
  }

  const handleSelectedChange = (item: StudioSuggestionItem | null): void => {
    setSelectedDataModelId(item?.value ?? '');
  };

  const handleCreateLayoutSet = (): void => {
    if (!newLayoutSetName || !selectedDataModelId || newLayoutSetNameError) return;

    addLayoutSet({
      taskType: 'pdf',
      layoutSetConfig: {
        id: newLayoutSetName,
        dataType: selectedDataModelId,
        taskId: bpmnDetails.id,
      },
    });
  };

  const handleLayoutSetNameChange = (value: string): void => {
    setNewLayoutSetName(value);
    setNewLayoutSetNameError(validateLayoutSetName(value, layoutSets));
  };

  return (
    <StudioCard className={classes.createLayoutSet}>
      <StudioTextfield
        label={t('process_editor.configuration_panel_pdf_layout_set_name_label')}
        description={t('process_editor.configuration_panel_pdf_layout_set_name_description')}
        value={newLayoutSetName}
        error={newLayoutSetNameError}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleLayoutSetNameChange(e.target.value)
        }
      />

      <StudioSuggestion
        multiple={false}
        label={t('process_editor.configuration_panel_pdf_select_data_model_label')}
        description={t('process_editor.configuration_panel_pdf_select_data_model_description')}
        emptyText={t('process_editor.configuration_panel_pdf_no_data_models')}
        selected={selectedDataModelId || undefined}
        onSelectedChange={handleSelectedChange}
      >
        {allDataModelIds.map((option) => (
          <StudioSuggestion.Option value={option} key={option} label={option}>
            {option}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>

      <StudioButton
        onClick={handleCreateLayoutSet}
        variant='primary'
        disabled={!newLayoutSetName || !selectedDataModelId || !!newLayoutSetNameError}
      >
        {t('process_editor.configuration_panel_pdf_create_button')}
      </StudioButton>
    </StudioCard>
  );
};
