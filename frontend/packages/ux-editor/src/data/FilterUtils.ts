import { ComponentType } from 'app-shared/types/ComponentType';
import { formItemConfigs, FormItemConfigs } from '@altinn/ux-editor/data/formItemConfig';

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
      formItemConfigs[ComponentType.FileUpload],
      formItemConfigs[ComponentType.FileUploadWithTag],
      formItemConfigs[ComponentType.SubForm],
    ];
    return !unsupportedSubformComponents.includes(component);
  };
}
