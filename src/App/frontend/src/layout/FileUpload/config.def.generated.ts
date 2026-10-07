import { FormComponent } from 'src/layout/LayoutComponent';
import type { DisplayData } from 'src/features/displayData/index';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export abstract class FileUploadDef extends FormComponent<'FileUpload'> implements DisplayData {
  protected readonly type = 'FileUpload';

  supportsRequiredProperty(): boolean {
    return false;
  }

  // You must implement this because the component has data model bindings defined
  abstract validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'FileUpload'>,
    context: DataModelBindingValidationContext,
  ): string[];

  // This component has data model bindings, so it should be able to produce a display string
  abstract useDisplayData(baseComponentId: string): string;
}

// Source hash: 712d458e5f042279ad183dd375b375c4ba77ef555f72f96c5191f9b849f8f311
