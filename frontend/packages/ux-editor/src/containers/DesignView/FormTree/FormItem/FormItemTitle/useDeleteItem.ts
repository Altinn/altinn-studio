import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useDeleteFormContainerMutation } from '../../../../../hooks/mutations/useDeleteFormContainerMutation';
import { useDeleteFormComponentMutation } from '../../../../../hooks/mutations/useDeleteFormComponentMutation';
import { useMemo } from 'react';
import { isContainer } from '../../../../../utils/formItemUtils';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { useAppContext } from '../../../../../hooks/useAppContext';

export const useDeleteItem = (formItem: FormComponent | FormContainer) => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { mutate: deleteContainer } = useDeleteFormContainerMutation(org, app, selectedLayoutSet);
  const { mutate: deleteComponent } = useDeleteFormComponentMutation(org, app, selectedLayoutSet);
  return useMemo(
    () => (isContainer(formItem) ? deleteContainer : deleteComponent),
    [deleteContainer, deleteComponent, formItem],
  );
};
