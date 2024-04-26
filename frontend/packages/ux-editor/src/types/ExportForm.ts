import type { ExternalComponentBase } from 'app-shared/types/api';

export type ExportForm = {
  [id: string]: ExportFormComponent[];
};

export type ExportFormComponent = ExternalComponentBase & {
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
