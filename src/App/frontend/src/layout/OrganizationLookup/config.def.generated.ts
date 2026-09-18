import { FormComponent } from 'src/layout/LayoutComponent';
import type { DisplayData } from 'src/features/displayData/index';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class OrganizationLookupDef extends FormComponent<'OrganizationLookup'> implements DisplayData {
  protected readonly type = 'OrganizationLookup';

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'OrganizationLookup'>,
    context: DataModelBindingValidationContext,
  ): string[];

  // This component has data model bindings, so it should be able to produce a display string
  abstract useDisplayData(baseComponentId: string): string;
}

// Source hash: 0c637aad6a33b2149a2e30ec29503b6d117c1d022e71d08b57bf9dfdf84b280c
