import { formItemConfigs } from '../../data/formItemConfig';
import type { ExternalGroupComponent } from '../../types/ExternalGroupComponent';
import type { FormContainer } from '../../types/FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';

export const externalGroupComponentToInternal = (
  externalComponent: ExternalGroupComponent,
  pageIndex: number | null,
): FormContainer => {
  const propertiesToKeep = { ...externalComponent };
  delete propertiesToKeep.children;
  delete propertiesToKeep.type;

  return {
    ...propertiesToKeep,
    itemType: 'CONTAINER',
    propertyPath: formItemConfigs[ComponentType.Group].defaultProperties.propertyPath,
    pageIndex,
  };
};
