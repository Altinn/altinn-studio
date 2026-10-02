import type { MetadataForm } from '../BpmnMetadataForm';
import type { BpmnTaskType } from '../BpmnTaskType';
import type { DataTypesChange } from './DataTypesChange';
import type { LayoutSetConfig } from './LayoutSetsResponse';

export type ProcessState = {
  bpmnXml: string;
  /** Identifies the process and its dependent files; sent as expectedVersion when saving. */
  version: string;
};

/** Send a BPMN snapshot or exactly one explicit operation. */
export type ProcessChangeContent = {
  bpmnXml?: string;
  /** Only subform PDF metadata may be sent without BPMN. */
  metadata?: MetadataForm;
  layoutSetCreation?: { taskType?: BpmnTaskType; layoutSetConfig: LayoutSetConfig };
  layoutSetDeletion?: { layoutSetIdToUpdate: string };
  /** Renaming a task's layout set also changes its BPMN ID. */
  layoutSetRename?: { layoutSetIdToUpdate: string; newLayoutSetId: string };
  dataTypesChange?: DataTypesChange;
};

export type ProcessChange = ProcessChangeContent & {
  expectedVersion: string;
};
