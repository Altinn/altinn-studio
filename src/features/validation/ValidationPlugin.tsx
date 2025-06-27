import { CG } from 'src/codegen/CG';
import { getInitialMask } from 'src/features/validation/utils';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { ComponentValidation } from 'src/features/validation/index';
import type { CompCategory } from 'src/layout/common';
import type { TypesFromCategory } from 'src/layout/layout';
import type { DefPluginExtraState, DefPluginStateFactoryProps } from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config {
  componentType: TypesFromCategory<CompCategory.Form | CompCategory.Container>;
  extraState: {
    validations: ComponentValidation[];
    validationVisibility: number;
    initialVisibility: number;
  };
}

const emptyArray = [];

/**
 * Adds validation support to a form or container component. This is added to your component by default
 * when one of these categories are selected.
 */
export class ValidationPlugin extends NodeDefPlugin<Config> {
  protected component: ComponentConfig | undefined;

  makeImport() {
    return new CG.import({
      import: 'ValidationPlugin',
      from: 'src/features/validation/ValidationPlugin',
    });
  }

  getKey(): string {
    return 'ValidationPlugin';
  }

  addToComponent(component: ComponentConfig) {
    this.component = component;
    if (!component.isFormLike()) {
      throw new Error('ValidationPlugin can only be used with container or form components');
    }
  }

  stateFactory(props: DefPluginStateFactoryProps): DefPluginExtraState<Config> {
    return {
      validations: emptyArray,
      validationVisibility: 0,
      initialVisibility: getInitialMask(props),
    };
  }

  extraNodeGeneratorChildren(): string {
    const StoreValidationsInNode = new CG.import({
      import: 'StoreValidationsInNode',
      from: 'src/features/validation/StoreValidationsInNode',
    });

    return `<${StoreValidationsInNode} />`;
  }
}
