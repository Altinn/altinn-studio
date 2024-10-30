import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

type SubformLayoutSet = LayoutSetConfig & {
  type: 'subform';
};

interface SubformUtils {
  hasSubforms: boolean;
  subformLayoutSetsIds: Array<string>;
}

export class SubformUtilsImpl implements SubformUtils {
  constructor(private readonly layoutSets: Array<LayoutSetConfig>) {}

  public get hasSubforms(): boolean {
    return this.getSubformLayoutSets.length > 0;
  }

  public get subformLayoutSetsIds(): Array<string> {
    return this.getSubformLayoutSets.map((set: SubformLayoutSet) => set.id);
  }

  private get getSubformLayoutSets(): Array<SubformLayoutSet> {
    return (this.layoutSets || []).filter(
      (set) => set.type === 'subform',
    ) as Array<SubformLayoutSet>;
  }
}
