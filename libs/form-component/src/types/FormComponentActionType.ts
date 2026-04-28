export const FormComponentActionType = {
  PatchDataModel: 'patchDataModel',
} as const;

export type FormComponentActionType =
  (typeof FormComponentActionType)[keyof typeof FormComponentActionType];
