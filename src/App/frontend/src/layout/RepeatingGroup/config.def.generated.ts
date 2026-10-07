import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class RepeatingGroupDef extends ContainerComponent<'RepeatingGroup'> {
  protected readonly type = 'RepeatingGroup';

  directRender(): boolean {
    return true;
  }

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'RepeatingGroup'>,
    context: DataModelBindingValidationContext,
  ): string[];
}

// Source hash: 2ec969adcef72f75d526e1f2380fc852ea9d4ab1d2fbe7a59df28ff181bb8d0c
