export interface CustomTemplate {
  id: string;
  owner: string;
  name: Record<string, string>;
  description: Record<string, string>;
}

export interface CustomTemplateList {
  templates: CustomTemplate[];
  totalCount: number;
}
