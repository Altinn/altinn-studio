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
 * The pages a subform pdf task renders through, and the affordance that creates them.
 *
 * The task cannot work without them. The app frontend takes the ui folder from the task id in the
 * pdf url and resolves `subformComponentId` inside it, so the id the task points at has to be a
 * Subform component on these pages. Without the folder the frontend also reads the task as a service
 * task rather than a form task (`getTaskTypeById` returns `Data` for any task id that has a ui
 * folder) and the pdf route has no layout to render at all.
 *
 * Creating the folder is therefore the first half of the job, not the whole of it: Studio creates it
 * empty, and the Subform component is something the developer adds in the designer afterwards. The
 * text says so in both states rather than presenting the create as the end of the task.
 *
 * Two things differ from the pdf task's version of this section, which is otherwise the same
 * affordance:
 *
 * - There is nothing to name. In v9 a layout set's folder name is the task id itself - the ui
 *   folders endpoint returns no `taskId`, and the app frontend looks the folder up by task id - so a
 *   name the developer typed would produce a folder neither Studio nor the runtime could find.
 * - The layout set is not a mode the developer chooses between, so there is no way back out of it
 *   and no deletion offered here.
 *
 * The data model is asked for all the same. A ui folder without a `defaultDataType` makes the app
 * frontend throw when it loads the folder, and that holds whatever the folder is for.
 */
export const SubformPdfLayoutSetSection = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails } = useBpmnContext();
  const { addLayoutSet, allDataModelIds = [] } = useBpmnApiContext();
  const { currentLayoutSet } = useCurrentLayoutSet();
  const layoutSetPath = useLayoutSetPath(org, app, currentLayoutSet?.id);

  const [selectedDataModelId, setSelectedDataModelId] = useState<string>('');
  // The create button stays enabled and reports the missing answer, rather than being disabled into
  // silence. The field is only marked as wrong once the developer has asked for something it stops.
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
      // The task type gives the folder the waiting page bound to the `service_task.waiting_*` texts.
      // A subform pdf task needs it for the same reason a pdf task does: the folder replaces the
      // frontend's built-in service task view, so without that page the end user waits in front of
      // an empty screen. It gets no pdf layout, unlike a pdf task's folder, since the generated pdf
      // comes from the subform's layout set rather than from this one.
      taskType: 'subformPdf',
      layoutSetConfig: {
        id: bpmnDetails.id,
        dataType: selectedDataModelId,
        taskId: bpmnDetails.id,
      },
    });
  };

  return (
    // The tag sits on the legend, not on the field: the group asks for one answer and it is
    // required, which is the case the pattern says to state once at group level. It is also the
    // only place it fits on one line - a field label inside a `ds-field` is a block, so a tag after
    // it wraps under the label, and every other group in these panels carries it beside the legend.
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
        // The pdf panel's own wording for an app without data models, rather than a second string
        // saying the same thing.
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
