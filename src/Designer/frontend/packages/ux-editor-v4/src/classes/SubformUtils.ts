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

  public get recommendedNextActionText(): {
    title: string;
    description: string;
  } {
    return this.hasSubforms
      ? {
          title: 'ux_editor.component_properties.subform.choose_layout_set_header',
          description: 'ux_editor.component_properties.subform.choose_layout_set_description',
        }
      : {
          title: 'ux_editor.component_properties.subform.no_existing_layout_set_header',
          description:
            'ux_editor.component_properties.subform.no_existing_layout_set_create_content',
        };
  }
}
