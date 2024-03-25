export interface LayoutSets {
  sets: LayoutSetConfig[];
}

export interface LayoutSetConfig {
  id: string;
  dataType?: string;
  tasks: string[];
}
