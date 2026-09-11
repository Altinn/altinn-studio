import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import type { AppTemplate } from 'app-shared/types/AppTemplate';

export type NewAppForm = {
  org?: string;
  repoName?: string;
  appTemplate?: AppTemplate;
  template?: CustomTemplate;
};
