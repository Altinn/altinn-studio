import type { CustomTemplate } from 'app-shared/types/CustomTemplate';

export type NewAppForm = {
  org?: string;
  repoName?: string;
  template?: CustomTemplate;
};
