import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

const SUBFORM_IDENTIFIER = 'subform';

export class SubformUtils {
  public static findSubformById(
    layoutSets: Array<LayoutSet>,
    layoutSetId: string,
  ): LayoutSet | null {
    const foundLayoutSet = layoutSets.find(({ id }) => id === layoutSetId);

    if (!foundLayoutSet) return null;

    return SubformUtils.isLayoutSetSubform(foundLayoutSet) ? foundLayoutSet : null;
  }

  private static isLayoutSetSubform(layoutSet: LayoutSet): boolean {
    return layoutSet.type === SUBFORM_IDENTIFIER;
  }
}
