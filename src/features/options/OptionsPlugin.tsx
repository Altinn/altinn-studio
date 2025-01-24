import { CG } from 'src/codegen/CG';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { ISelectionComponent, ISelectionComponentFull } from 'src/layout/common.generated';
import type { CompTypes } from 'src/layout/layout';
import type { DefPluginExtraState, DefPluginStateFactoryProps } from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config<SupportsPreselection extends boolean> {
  componentType: CompTypes;
  expectedFromExternal: SupportsPreselection extends true ? ISelectionComponentFull : ISelectionComponent;
  settings: {
    allowsEffects?: boolean;
    supportsPreselection: SupportsPreselection;
    type: OptionsValueType;
  };
  extraState: {
    options: IOptionInternal[] | undefined;
    isFetchingOptions: boolean;
  };
}

interface ExternalConfig {
  allowsEffects?: boolean;
  supportsPreselection: boolean;
  type: OptionsValueType;
}

type ToInternal<E extends ExternalConfig> = Config<E['supportsPreselection']>;

export class OptionsPlugin<E extends ExternalConfig> extends NodeDefPlugin<ToInternal<E>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeImport(): GenerateImportedSymbol<any> {
    return new CG.import({
      import: 'OptionsPlugin',
      from: 'src/features/options/OptionsPlugin',
    });
  }

  getKey(): string {
    return 'OptionsPlugin';
  }

  stateFactory(_props: DefPluginStateFactoryProps<ToInternal<E>>): DefPluginExtraState<ToInternal<E>> {
    return {
      options: undefined,
      isFetchingOptions: true,
    };
  }

  addToComponent(component: ComponentConfig): void {
    component.inner.extends(
      this.settings!.supportsPreselection ? CG.common('ISelectionComponentFull') : CG.common('ISelectionComponent'),
    );
    component.behaviors.canHaveOptions = true;
  }

  extraNodeGeneratorChildren(): string {
    const StoreOptionsInNode = new CG.import({
      import: 'StoreOptionsInNode',
      from: 'src/features/options/StoreOptionsInNode',
    });

    const allowsEffects = this.settings!.allowsEffects ?? true;

    return `
      <${StoreOptionsInNode}
        valueType={'${this.settings!.type}'}
        allowEffects={${allowsEffects ? 'true' : 'false'}}
      />`.trim();
  }
}
