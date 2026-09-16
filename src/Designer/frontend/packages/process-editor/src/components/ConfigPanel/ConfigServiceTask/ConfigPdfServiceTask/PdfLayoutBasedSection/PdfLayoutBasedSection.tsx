import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  StudioButton,
  StudioCard,
  StudioSuggestion,
  type StudioSuggestionItem,
} from '@studio/components';
import { PencilIcon } from '@studio/icons';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentLayoutSet } from '../../../../../hooks/useCurrentLayoutSet';
import classes from './PdfLayoutBasedSection.module.css';

/**
 * The layout-based half of the pdf task: the pages the pdf is rendered from, and the affordance
 * that creates them.
 *
 * There is nothing to name. In v9 a layout set's folder name is the task id itself - the ui folders
 * endpoint returns no `taskId`, so `getTaskIdForLayoutSet` falls back to the id, and the app
 * frontend resolves the folder from the task id in the url. A name the developer typed would
 * produce a folder neither this panel nor the runtime could find again, leaving the panel offering
 * to create a layout set the task already has.
 *
 * The data model is asked for all the same. A ui folder without a `defaultDataType` makes the app
 * frontend throw when it loads the folder.
 */
export const PdfLayoutBasedSection = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails } = useBpmnContext();
  const { addLayoutSet, allDataModelIds = [] } = useBpmnApiContext();
  const { currentLayoutSet } = useCurrentLayoutSet();

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
    if (!selectedDataModelId) return;

    addLayoutSet({
      taskType: 'pdf',
      layoutSetConfig: {
        id: bpmnDetails.id,
        dataType: selectedDataModelId,
        taskId: bpmnDetails.id,
      },
    });
  };

  return (
    <StudioCard className={classes.createLayoutSet}>
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
        disabled={!selectedDataModelId}
      >
        {t('process_editor.configuration_panel_pdf_create_button')}
      </StudioButton>
    </StudioCard>
  );
};
