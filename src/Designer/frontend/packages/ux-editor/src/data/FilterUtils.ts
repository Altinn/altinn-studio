import { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs, type FormItemConfigEntry } from './formItemConfig';

export class FilterUtils {
  public static filterOutDisabledFeatureItems(item: FormItemConfigEntry | boolean): boolean {
    return Boolean(item);
  }

  public static filterUnsupportedSubformComponents = (component: FormItemConfigEntry): boolean => {
    const unsupportedSubformComponents: FormItemConfigEntry[] = [
      formItemConfigs[ComponentType.Button],
      formItemConfigs[ComponentType.FileUpload],
      formItemConfigs[ComponentType.InstantiationButton],
      formItemConfigs[ComponentType.Payment],
      formItemConfigs[ComponentType.Subform],
    ];
    return !unsupportedSubformComponents.includes(component);
  };
}
