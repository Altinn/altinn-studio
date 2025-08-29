import type { ExternalComponentBase } from 'app-shared/types/api';

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

export type ExportFormComponent = ExternalComponentBase & {
  sortOrder?: number;
  texts: ExportTextResource[];
  options?: ExportOption[];
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
  value: string;
  label: ExportTextResourceValue[];
};
