import type { IRuntimeState } from 'src/types';

export const selectFormLayoutState = (state: IRuntimeState) => state.formLayout;
export const selectFormData = (state: IRuntimeState) => state.formData.formData;
export const selectFormLayouts = (state: IRuntimeState) => state.formLayout.layouts;
