import type { SerializedComponent } from './SerializedComponent';

export type ExportForm = {
  appId: string;
  formId: string;
  pages: ExportFormPage[];
};

export type ExportFormPage = {
  pageId: string;
  sortOrder: number;
  components: ExportFormComponent[];
};

export type ExportFormComponent = {
  id: string;
  type: SerializedComponent['type'];
  dataModelBindings?: SerializedComponent['dataModelBindings'];
  sortOrder?: number;
  texts: ExportTextResource[];
  options?: ExportOption[];
  [key: string]: unknown;
};

export type ExportTextResource = {
  id: string;
  type: string;
  text: ExportTextResourceValue[];
};

export type ExportTextResourceValue = {
  language: string;
  value: string;
};

export type ExportOption = {
  value: IRawOption['value'];
  label: ExportTextResourceValue[];
};
import type { IRawOption } from '@app/layout-contract/generated/common.generated';
