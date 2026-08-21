import type { ExternalContainerComponent } from '../../types/ExternalContainerComponent';
import type { FormContainer } from '../../types/FormContainer';

export const externalContainerComponentToInternal = (
  externalComponent: ExternalContainerComponent,
  pageIndex: number | null,
): FormContainer => {
  const propertiesToKeep = { ...externalComponent };
  delete propertiesToKeep.children;

  return {
    ...propertiesToKeep,
    itemType: 'CONTAINER',
    type: externalComponent.type,
    pageIndex,
  } as FormContainer;
};
