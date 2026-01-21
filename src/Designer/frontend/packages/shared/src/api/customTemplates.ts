import { get } from 'app-shared/utils/networking';
import type { CustomTemplate, CustomTemplateList } from '../types/CustomTemplate';

export const fetchCustomTemplates = async (): Promise<CustomTemplate[]> => {
  const response = await get<CustomTemplateList>('/designer/api/customtemplates');
  return response.templates;
};
