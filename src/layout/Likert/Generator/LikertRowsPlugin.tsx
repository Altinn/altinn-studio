import { CG } from 'src/codegen/CG';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IDataModelBindingsLikert } from 'src/layout/common.generated';
import type {
  DefPluginChildClaimerProps,
  DefPluginState,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config {
  componentType: 'Likert';
  expectedFromExternal: {
    dataModelBindings: IDataModelBindingsLikert;
  };
}

export class LikertRowsPlugin extends NodeDefPlugin<Config> implements NodeDefChildrenPlugin<Config> {
  public settings = {
    internalProp: 'rows',
  };

  makeImport() {
    return new CG.import({
      import: 'LikertRowsPlugin',
      from: 'src/layout/Likert/Generator/LikertRowsPlugin',
    });
  }

  getKey(): string {
    return 'LikertRowsPlugin';
  }

  addToComponent(_component: ComponentConfig): void {}

  makeConstructorArgs(_asGenericArgs = false): string {
    return '';
  }

  extraNodeGeneratorChildren(): string {
    const LikertGeneratorChildren = new CG.import({
      import: 'LikertGeneratorChildren',
      from: 'src/layout/Likert/Generator/LikertGeneratorChildren',
    });
    return `<${LikertGeneratorChildren} />`;
  }

  claimChildren(props: DefPluginChildClaimerProps<Config>) {
    props.claimChild(makeLikertChildId(props.item.id));
  }

  isChildHidden(_state: DefPluginState<Config>, _childId: string, _lookup: LayoutLookups): boolean {
    return false;
  }
}
