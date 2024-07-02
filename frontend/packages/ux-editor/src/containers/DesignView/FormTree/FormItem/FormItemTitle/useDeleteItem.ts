import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDeleteFormContainerMutation } from '../../../../../hooks/mutations/useDeleteFormContainerMutation';
import { useDeleteFormComponentMutation } from '../../../../../hooks/mutations/useDeleteFormComponentMutation';
import { useMemo } from 'react';
import { isContainer } from '../../../../../utils/formItemUtils';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { useAppContext } from '../../../../../hooks';

export const useDeleteItem = (formItem: FormComponent | FormContainer) => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { mutate: deleteContainer } = useDeleteFormContainerMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { mutate: deleteComponent } = useDeleteFormComponentMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  return useMemo(
    () => (isContainer(formItem) ? deleteContainer : deleteComponent),
    [deleteContainer, deleteComponent, formItem],
  );
};
