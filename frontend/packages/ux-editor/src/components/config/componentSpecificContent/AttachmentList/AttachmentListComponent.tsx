import React, { useState } from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { useAppContext } from '../../../../hooks/useAppContext';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { AttachmentListContent } from './AttachmentListContent';
import { Switch } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { reservedDataTypes, convertAttachmentsToBackend } from './AttachmentListUtils';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.AttachmentList>) => {
  const { dataTypeIds = [] } = component || {};
  const [state, setState] = useState<{
    noneSelected: boolean;
    includePdf: boolean;
    onlyCurrentTask: boolean;
  }>({
    noneSelected: false,
    includePdf: dataTypeIds.includes(
      reservedDataTypes.refDataAsPdf || reservedDataTypes.includeAll,
    ),
    onlyCurrentTask: dataTypeIds.includes(reservedDataTypes.currentTask),
  });

  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();
  const { t } = useTranslation();

  const tasks: string[] =
    layoutSets && selectedLayoutSet
      ? getTasks(layoutSets, selectedLayoutSet, state.onlyCurrentTask)
      : [];

  if (appMetadataPending) return null;
  const comboboxAttachments: string[] = getAttachments(tasks, appMetadata);
  const comboboxSelectedAttachments: string[] = getSelectedAttachments(
    dataTypeIds,
    comboboxAttachments,
  );

  const onChangePdf = (isChecked: boolean) => {
    setState((preState) => ({ ...preState, includePdf: isChecked }));

    if (!isChecked && comboboxSelectedAttachments.length === 0) {
      setState((preState) => ({ ...preState, noneSelected: true }));
      return;
    }

    const resultingSelection = convertAttachmentsToBackend({
      includeAllAttachments:
        // Check if all is selected from the backend and no attachments are selected in current state
        comboboxSelectedAttachments.length === comboboxAttachments.length && !state.noneSelected,
      includePdf: isChecked,
      onlyCurrentTask: state.onlyCurrentTask,
      selectedAttachments: state.noneSelected ? [] : comboboxSelectedAttachments,
    });

    setState((preState) => ({ ...preState, noneSelected: false }));

    handleComponentChange({
      ...component,
      dataTypeIds: resultingSelection,
    });
  };

  const onChangeTask = (isChecked: boolean) => {
    setState((preState) => ({ ...preState, onlyCurrentTask: isChecked }));
    if (state.noneSelected && !state.includePdf) {
      return;
    }

    let updatedSelectedAttachments: string[];

    if (isChecked) {
      const updatedTasks = currentTasks(layoutSets, selectedLayoutSet);
      const updatedAttachments = getAttachments(updatedTasks, appMetadata);
      updatedSelectedAttachments = comboboxSelectedAttachments.filter((attachment) =>
        updatedAttachments.includes(attachment),
      );
    }

    const resultingSelection = convertAttachmentsToBackend({
      includeAllAttachments: comboboxSelectedAttachments.length === comboboxAttachments.length,
      includePdf: state.includePdf,
      onlyCurrentTask: isChecked,
      selectedAttachments: isChecked ? updatedSelectedAttachments : comboboxSelectedAttachments,
    });

    handleComponentChange({
      ...component,
      dataTypeIds: resultingSelection,
    });
  };

  return (
    <>
      <Switch
        onChange={(e) => onChangeTask(e.target.checked)}
        size='small'
        checked={state.onlyCurrentTask}
      >
        {t('ux_editor.component_properties.current_task')}
      </Switch>
      <Switch
        onChange={(e) => onChangePdf(e.target.checked)}
        size='small'
        checked={state.includePdf}
      >
        {t('ux_editor.component_properties.select_pdf')}
      </Switch>
      <AttachmentListContent
        component={component}
        handleComponentChange={handleComponentChange}
        selectedAttachments={comboboxSelectedAttachments}
        attachments={comboboxAttachments}
        state={state}
        setState={setState}
      />
    </>
  );
};

const getTasks = (
  layoutSets: LayoutSets,
  selectedLayoutSet: string,
  onlyCurrentTask: boolean,
): string[] => {
  return onlyCurrentTask
    ? currentTasks(layoutSets, selectedLayoutSet)
    : sampleTasks(layoutSets, selectedLayoutSet);
};

const currentTasks = (layoutSets: LayoutSets, selectedLayoutSet: string): string[] =>
  layoutSets.sets.find((layoutSet) => layoutSet.id === selectedLayoutSet).tasks;

const sampleTasks = (layoutSets: LayoutSets, selectedLayoutSet: string): string[] => {
  const tasks = [];
  for (const layoutSet of layoutSets.sets) {
    tasks.push(...layoutSet.tasks);
    if (layoutSet.id === selectedLayoutSet) {
      break;
    }
  }
  return tasks;
};

const getAttachments = (tasks: string[], appMetaData: ApplicationMetadata): string[] => {
  const filteredDataTypes = appMetaData?.dataTypes.filter(
    (dataType: DataTypeElement) =>
      !dataType.appLogic &&
      tasks.some((task) => dataType.taskId === task) &&
      dataType.id !== reservedDataTypes.refDataAsPdf &&
      dataType.id !== reservedDataTypes.currentTask,
  );

  const mappedDataTypes = filteredDataTypes?.map((dataType: DataTypeElement) => dataType.id) ?? [];
  const sortedDataTypes = mappedDataTypes.sort((a, b) => a.localeCompare(b));

  return sortedDataTypes;
};

const getSelectedAttachments = (
  selectedAttachments: string[] | undefined,
  attachments: string[],
): string[] => {
  const includeAllAndPdf = selectedAttachments.includes(reservedDataTypes.includeAll);
  const includeAll =
    selectedAttachments.length === 0 ||
    selectedAttachments.every((attachment) => attachment === reservedDataTypes.currentTask);

  const isAllAttachmentsSelected = includeAllAndPdf || includeAll;
  const filterSelectedAttachments = isAllAttachmentsSelected
    ? attachments
    : selectedAttachments.filter((attachment: string) => attachments.includes(attachment));

  return filterSelectedAttachments;
};
