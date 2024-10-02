import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

const SUBFORM_IDENTIFIER = 'subform';

export class SubFormUtils {
  public static findSubFormById(
    layoutSets: Array<LayoutSet>,
    layoutSetId: string,
  ): LayoutSet | null {
    const foundLayoutSet = layoutSets.find(({ id }) => id === layoutSetId);

    if (!foundLayoutSet) return null;

    return SubFormUtils.isLayoutSetSubForm(foundLayoutSet) ? foundLayoutSet : null;
  }

  private static isLayoutSetSubForm(layoutSet: LayoutSet): boolean {
    return layoutSet.type === SUBFORM_IDENTIFIER;
  }
}
