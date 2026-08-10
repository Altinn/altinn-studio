import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import type { AppTemplate } from 'app-shared/types/AppTemplate';

export type NewAppForm = {
  org?: string;
  repoName?: string;
  /** The scaffold the app is created from. Distinct from `template`, a content overlay. */
  appTemplate?: AppTemplate;
  template?: CustomTemplate;
};
