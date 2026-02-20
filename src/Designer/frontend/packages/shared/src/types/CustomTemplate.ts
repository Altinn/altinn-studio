export interface CustomTemplate {
  id: string;
  owner: string;
  name: string;
  description: string;
}

export interface CustomTemplateList {
  templates: CustomTemplate[];
  totalCount: number;
}
