import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  ExternalComponent,
  FormLayoutsResponse,
} from 'app-shared/types/api/FormLayoutsResponse';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const SUBFORM_LAYOUT_SET_TYPE = 'subform';

/**
 * The subform layout sets that keep their answers in the given data type.
 *
 * The task's `subformDataTypeId` is what the runtime matches data elements on
 * (`SubformPdfServiceTask.Execute`), and a subform layout set records the data type its answers are
 * stored as. The two are therefore the same value, which is what makes the component id derivable
 * at all.
 * @param layoutSets every layout set in the app.
 * @param subformDataTypeId the data type the task is configured with.
 * @returns the ids of the matching subform layout sets, empty when the data type is not chosen.
 */
export const getSubformLayoutSetIdsForDataType = (
  layoutSets: LayoutSets,
  subformDataTypeId: string,
): string[] => {
  if (!subformDataTypeId) return [];
  return (layoutSets ?? [])
    .filter((set) => set.type === SUBFORM_LAYOUT_SET_TYPE && set.dataType === subformDataTypeId)
    .map((set) => set.id);
};

/**
 * The ids of the Subform components in one layout set that open one of the given subform layout
 * sets.
 *
 * A Subform component names the layout set it opens in its `layoutSet` property, so these are the
 * components whose answers end up in the chosen data type, and therefore the ones the pdf task can
 * be pointed at. Only one layout set is searched, because the runtime resolves the id in one: the
 * ui folder named after the pdf task itself. See {@link ./useSubformComponentIds}.
 * @param formLayouts the layout files of that layout set, or undefined while they load.
 * @param subformLayoutSetIds the subform layout sets to look for.
 * @returns the component ids, in the order they were found.
 */
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
