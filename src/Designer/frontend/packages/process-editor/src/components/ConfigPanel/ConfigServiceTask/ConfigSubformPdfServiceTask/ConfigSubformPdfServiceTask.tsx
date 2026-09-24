import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioFormGroup, StudioList } from '@studio/components';
import { useSaveSubformPdfComponentMutation } from 'app-shared/hooks/mutations/useSaveSubformPdfComponentMutation';
import { useSubformComponentsQuery } from 'app-shared/hooks/queries/useSubformComponentsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useCurrentLayoutSet } from '../../../../hooks/useCurrentLayoutSet';
import { FilenameTextResource } from '../FilenameTextResource';
import { useSubformPdfConfig } from './useSubformPdfConfig';
import { SubformComponentIdField } from './SubformComponentIdField';
import { SubformPdfStatus } from './SubformPdfStatus';
import {
  getSelectableSubformComponentIds,
  getSourceSubformComponent,
  getSubformPdfIssue,
} from './subformPdfComponents';
import sharedClasses from '../ConfigServiceTask.module.css';

export const ConfigSubformPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails } = useBpmnContext();
  const { currentLayoutSet } = useCurrentLayoutSet();
  const { data: subformComponents } = useSubformComponentsQuery(org, app);
  const { mutate: saveSubformPdfComponent, isPending: isSavingSubformPdfComponent } =
    useSaveSubformPdfComponentMutation(org, app);
  const {
    subformComponentId,
    subformDataTypeId,
    filenameTextResourceId,
    setSubformComponentAndDataTypeIds,
    setSubformDataTypeId,
    setFilenameTextResourceId,
  } = useSubformPdfConfig();

  const taskId = bpmnDetails.id;

  const saveComponentCopy = ({ componentId, layoutSetId }: SubformComponent): void =>
    saveSubformPdfComponent({ layoutSetId: taskId, componentId, sourceLayoutSetId: layoutSetId });

  const handleSubformComponentIdChange = (componentId: string): void => {
    if (!componentId) {
      setSubformComponentAndDataTypeIds('', '');
      return;
    }
    const sourceComponent = getSourceSubformComponent(subformComponents, componentId, taskId);
    setSubformComponentAndDataTypeIds(componentId, sourceComponent.subformDataTypeId);
    saveComponentCopy(sourceComponent);
  };

  const handleCreateComponentCopy = (): void =>
    saveComponentCopy(getSourceSubformComponent(subformComponents, subformComponentId, taskId));

  // The components lack the copy until the save responds, so the status waits instead of flashing.
  const isStatusKnown = Boolean(subformComponents) && !isSavingSubformPdfComponent;

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <StudioFormGroup
          className={sharedClasses.group}
          legend={t('process_editor.configuration_panel_subform_pdf_legend')}
          required
          tagText={t('general.required')}
        >
          <SubformComponentIdField
            subformComponentId={subformComponentId}
            componentIds={getSelectableSubformComponentIds(subformComponents ?? [], taskId)}
            onChange={handleSubformComponentIdChange}
          />
          {isStatusKnown && (
            <SubformPdfStatus
              issue={getSubformPdfIssue(
                {
                  taskId,
                  hasPages: Boolean(currentLayoutSet),
                  subformComponentId,
                  subformDataTypeId,
                },
                subformComponents,
              )}
              subformComponentId={subformComponentId}
              pagesLayoutSetId={currentLayoutSet?.id}
              onFixDataType={setSubformDataTypeId}
              onCreateComponentCopy={handleCreateComponentCopy}
            />
          )}
        </StudioFormGroup>
      </StudioList.Item>

      <StudioList.Item>
        <FilenameTextResource
          textResourceId={filenameTextResourceId}
          onTextResourceIdChange={setFilenameTextResourceId}
          textResourceIdPrefix='subform-pdf-filename'
        />
      </StudioList.Item>
    </StudioList.Unordered>
  );
};
