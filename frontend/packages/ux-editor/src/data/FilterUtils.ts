import { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs, type FormItemConfigs } from './formItemConfig';

export class FilterUtils {
  public static filterOutDisabledFeatureItems(
    item: FormItemConfigs[ComponentType] | boolean,
  ): boolean {
    return Boolean(item);
  }

  public static filterUnsupportedSubformComponents = (
    component: FormItemConfigs[ComponentType],
  ): boolean => {
    const unsupportedSubformComponents: Array<FormItemConfigs[ComponentType]> = [
      formItemConfigs[ComponentType.Button],
      formItemConfigs[ComponentType.FileUpload],
      formItemConfigs[ComponentType.FileUploadWithTag],
      formItemConfigs[ComponentType.InstantiationButton],
      formItemConfigs[ComponentType.Payment],
      formItemConfigs[ComponentType.Subform],
    ];
    return !unsupportedSubformComponents.includes(component);
  };
}
