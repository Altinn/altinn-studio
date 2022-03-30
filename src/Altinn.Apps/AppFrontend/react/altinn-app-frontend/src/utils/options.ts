import { IFormData } from "src/features/form/data/formDataReducer";
import { IMapping } from "src/types";

export function getOptionLookupKey(id: string, mapping?: IMapping) {
  if (!mapping) {
    return id;
  }

  return JSON.stringify({ id, mapping });
}

export function replaceOptionDataField(formData: IFormData, valueString: string, index: number) {
  const indexedValueString = valueString.replace('{0}', index.toString());
  return formData[indexedValueString];
}
