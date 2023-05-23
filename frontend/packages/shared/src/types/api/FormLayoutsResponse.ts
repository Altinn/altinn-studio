import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FormItemType } from 'app-shared/types/FormItemType';

export type FormLayoutsResponse = KeyValuePairs<ExternalFormLayout>;

export interface ExternalFormLayout {
  $schema: string;
  data: ExternalData;
  [key: string]: any;
}

export interface ExternalData {
  layout: ExternalComponent[];
  hidden?: boolean;
  [key: string]: any;
}

export interface ExternalComponent {
  id: string;
  type: FormItemType;
  [key: string]: any; // Todo: Set type here
}
