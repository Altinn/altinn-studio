import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  StudioButton,
  StudioFormGroup,
  StudioRedirectBox,
  StudioSuggestion,
  type StudioSuggestionItem,
} from '@studio/components';
import { PencilWritingIcon } from '@studio/icons';
import { useLayoutSetPath } from 'app-shared/hooks/queries/useLayoutSetPath';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { useCurrentLayoutSet } from '../../../../../hooks/useCurrentLayoutSet';
import sharedClasses from '../../ConfigServiceTask.module.css';

/**
 * The pages a subform pdf task renders through. The app frontend resolves `subformComponentId`
 * inside the ui folder named after the task, so the folder is created under the task id and the
 * developer adds the Subform component to it afterwards.
 */
export const SubformPdfLayoutSetSection = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails } = useBpmnContext();
  const { addLayoutSet, allDataModelIds = [] } = useBpmnApiContext();
  const { currentLayoutSet } = useCurrentLayoutSet();
  const layoutSetPath = useLayoutSetPath(org, app, currentLayoutSet?.id);

  const [selectedDataModelId, setSelectedDataModelId] = useState<string>('');
  const [isDataModelTouched, setIsDataModelTouched] = useState(false);

  if (currentLayoutSet) {
    return (
      <StudioRedirectBox
        title={t('process_editor.configuration_panel_subform_pdf_pages_next_step')}
      >
        <StudioButton variant='tertiary' icon={<PencilWritingIcon />}>
          <Link to={layoutSetPath}>
            {t('process_editor.configuration_panel_subform_pdf_pages_link')}
          </Link>
        </StudioButton>
      </StudioRedirectBox>
    );
  }

  const handleSelectedChange = (item: StudioSuggestionItem | null): void => {
    setIsDataModelTouched(true);
    setSelectedDataModelId(item?.value ?? '');
  };

  const handleCreateLayoutSet = (): void => {
    setIsDataModelTouched(true);
    if (!selectedDataModelId) return;

    addLayoutSet({
      taskType: 'subformPdf',
      layoutSetConfig: {
        id: bpmnDetails.id,
        dataType: selectedDataModelId,
        taskId: bpmnDetails.id,
      },
    });
  };

  return (
    <StudioFormGroup
      className={sharedClasses.group}
      description={t('process_editor.configuration_panel_subform_pdf_pages_description')}
      legend={t('process_editor.configuration_panel_subform_pdf_pages_legend')}
      required
      tagText={t('general.required')}
    >
      <StudioSuggestion
        description={t(
          'process_editor.configuration_panel_subform_pdf_pages_data_model_description',
        )}
        emptyText={t('process_editor.configuration_panel_pdf_no_data_models')}
        error={isDataModelTouched && !selectedDataModelId && t('validation_errors.required')}
        label={t('process_editor.configuration_panel_subform_pdf_pages_data_model_label')}
        multiple={false}
        onBlur={() => setIsDataModelTouched(true)}
        onSelectedChange={handleSelectedChange}
        required
        selected={selectedDataModelId || undefined}
      >
        {allDataModelIds.map((dataModelId) => (
          <StudioSuggestion.Option key={dataModelId} label={dataModelId} value={dataModelId}>
            {dataModelId}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>

      <StudioButton onClick={handleCreateLayoutSet} variant='primary'>
        {t('process_editor.configuration_panel_subform_pdf_pages_create_button')}
      </StudioButton>
    </StudioFormGroup>
  );
};
