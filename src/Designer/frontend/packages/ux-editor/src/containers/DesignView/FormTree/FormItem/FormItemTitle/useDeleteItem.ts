import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDeleteFormContainerMutation } from '../../../../../hooks/mutations/useDeleteFormContainerMutation';
import { useDeleteFormComponentMutation } from '../../../../../hooks/mutations/useDeleteFormComponentMutation';
import { useMemo } from 'react';
import { isContainer } from '../../../../../utils/formItemUtils';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export const useDeleteItem = (formItem: FormComponent | FormContainer) => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { mutate: deleteContainer } = useDeleteFormContainerMutation(org, app, layoutSet);
  const { mutate: deleteComponent } = useDeleteFormComponentMutation(org, app, layoutSet);
  return useMemo(
    () => (isContainer(formItem) ? deleteContainer : deleteComponent),
    [deleteContainer, deleteComponent, formItem],
  );
};
