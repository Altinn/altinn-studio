import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

type SubFormLayoutSet = LayoutSetConfig & {
  type: 'subform';
};

interface SubFormUtils {
  hasSubforms: boolean;
  subformLayoutSetsIds: Array<string>;
}

export class SubFormUtilsImpl implements SubFormUtils {
  constructor(private readonly layoutSets: Array<LayoutSetConfig>) {}

  public get hasSubforms(): boolean {
    return this.getSubformLayoutSets.length > 0;
  }

  public get subformLayoutSetsIds(): Array<string> {
    return this.getSubformLayoutSets.map((set: SubFormLayoutSet) => set.id);
  }

  private get getSubformLayoutSets(): Array<SubFormLayoutSet> {
    return (this.layoutSets || []).filter(
      (set) => set.type === 'subform',
    ) as Array<SubFormLayoutSet>;
  }
}
