import type { IFormData } from "src/features/form/data/formDataReducer";
import type { IMapping, IOptionSource } from "src/types";

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

export function getRelevantFormDataForOptionSource(formData: IFormData, source: IOptionSource) {
  const relevantFormData: IFormData = {};

  if (!formData || !source) {
    return relevantFormData;
  }

  Object.keys(formData).forEach((key) => {
    if (key.includes(source.group)) {
      relevantFormData[key] = formData[key];
    }
  });

  return relevantFormData;
}
