import type { DataModelBinding } from './DataModelBinding';
import type { FormComponentActionType } from './FormComponentActionType';

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
