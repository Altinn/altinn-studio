import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  ExternalComponent,
  FormLayoutsResponse,
} from 'app-shared/types/api/FormLayoutsResponse';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const SUBFORM_LAYOUT_SET_TYPE = 'subform';

/** The subform layout sets storing their answers in the given data type. */
export const getSubformLayoutSetIdsForDataType = (
  layoutSets: LayoutSets,
  subformDataTypeId: string,
): string[] => {
  if (!subformDataTypeId) return [];
  return (layoutSets ?? [])
    .filter((set) => set.type === SUBFORM_LAYOUT_SET_TYPE && set.dataType === subformDataTypeId)
    .map((set) => set.id);
};

/** The ids of the Subform components in the layouts that open one of the given layout sets. */
export const getSubformComponentIds = (
  formLayouts: FormLayoutsResponse | undefined,
  subformLayoutSetIds: string[],
): string[] =>
  Object.values(formLayouts ?? {})
    .flatMap((formLayout) => formLayout?.data?.layout ?? [])
    .filter((component) => opensOneOfTheLayoutSets(component, subformLayoutSetIds))
    .map((component) => component.id);

const opensOneOfTheLayoutSets = (
  component: ExternalComponent,
  subformLayoutSetIds: string[],
): boolean =>
  component?.type === ComponentType.Subform &&
  subformLayoutSetIds.includes(component.layoutSet as string);
