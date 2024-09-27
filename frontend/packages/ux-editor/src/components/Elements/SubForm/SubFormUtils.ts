import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

const SUB_FORM_IDENTIFIER = 'subform';

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
    return layoutSet.type === SUB_FORM_IDENTIFIER;
  }
}
