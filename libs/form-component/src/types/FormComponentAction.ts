import { FormComponentActionType } from './FormComponentActionType';
import type { DataModelBinding } from './DataModelBinding';

export type PatchDataModelPayload = {
  dataModelBinding: DataModelBinding;
  value: string;
};

export type FormComponentActionPayloadMap = {
  [FormComponentActionType.PatchDataModel]: PatchDataModelPayload;
};

export type FormComponentAction = {
  [K in FormComponentActionType]: {
    type: K;
    payload: FormComponentActionPayloadMap[K];
  };
}[FormComponentActionType];
