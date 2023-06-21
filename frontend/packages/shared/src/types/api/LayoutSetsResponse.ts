export interface LayoutSets {
  sets: LayoutSetConfig[];
}

export interface LayoutSetConfig {
  id: string;
  dataTypes: string;
  tasks: string[];
}
