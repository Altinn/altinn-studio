import React from 'react';
import { StudioList } from '@studio/components';
import { useSubformComponentsQuery } from 'app-shared/hooks/queries/useSubformComponentsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import { useCurrentLayoutSet } from '../../../../hooks/useCurrentLayoutSet';
import { FilenameTextResource } from '../FilenameTextResource';
import { useSubformPdfConfig } from './useSubformPdfConfig';
import { SubformComponentIdField } from './SubformComponentIdField';
import { SubformPdfStatus } from './SubformPdfStatus';
import type { ReadOnlyCommandStack } from '../../../../utils/bpmnModeler/ReadOnlyCommandStack';
import {
  getSelectableSubformComponentIds,
  getSourceSubformComponent,
  getSubformPdfIssue,
} from './subformPdfComponents';
import sharedClasses from '../ConfigServiceTask.module.css';

export const ConfigSubformPdfServiceTask = (): React.ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { pendingApiOperations, saveSubformPdfComponent } = useBpmnApiContext();
  const { metadataFormRef } = useBpmnConfigPanelFormContext();
  const { currentLayoutSet } = useCurrentLayoutSet();
  const { data: subformComponents, isFetching: isFetchingSubformComponents } =
    useSubformComponentsQuery(org, app);
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
    saveSubformPdfComponent({ taskId, componentId, sourceLayoutSetId: layoutSetId });

  const handleSubformComponentIdChange = (componentId: string): void => {
    // Ignored commands must not leave metadata for a later edit.
    if (modelerRef.current.get<ReadOnlyCommandStack>('commandStack').readOnly) return;
    if (!componentId) {
      if (subformComponentId) {
        metadataFormRef.current = {
          ...metadataFormRef.current,
          subformPdfComponentChange: {
            taskId,
            componentId: null,
            previousComponentId: subformComponentId,
          },
        };
      }
      setSubformComponentAndDataTypeIds('', '');
      return;
    }
    const sourceComponent = getSourceSubformComponent(subformComponents, componentId);
    if (
      componentId === subformComponentId &&
      sourceComponent.subformDataTypeId === subformDataTypeId
    )
      return;
    metadataFormRef.current = {
      ...metadataFormRef.current,
      subformPdfComponentChange: {
        taskId,
        componentId,
        sourceLayoutSetId: sourceComponent.layoutSetId,
        previousComponentId: subformComponentId || undefined,
      },
    };
    setSubformComponentAndDataTypeIds(componentId, sourceComponent.subformDataTypeId);
  };

  const handleCreateComponentCopy = (): void =>
    saveComponentCopy(getSourceSubformComponent(subformComponents, subformComponentId));

  const isSaving = pendingApiOperations;
  const isStatusKnown = Boolean(subformComponents) && !isSaving && !isFetchingSubformComponents;

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <div className={sharedClasses.group}>
          <SubformComponentIdField
            subformComponentId={subformComponentId}
            componentIds={getSelectableSubformComponentIds(subformComponents ?? [])}
            onChange={handleSubformComponentIdChange}
            disabled={isSaving}
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
        </div>
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
