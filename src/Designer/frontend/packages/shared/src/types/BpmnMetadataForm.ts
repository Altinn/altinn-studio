export type TaskIdChange = {
  oldId: string;
  newId: string;
};

export type MetadataForm = {
  taskIdChange?: TaskIdChange;
  subformPdfComponentChange?: SubformPdfComponentPayload & { taskId: string };
};
import type { SubformPdfComponentPayload } from './api/SubformPdfComponentPayload';
