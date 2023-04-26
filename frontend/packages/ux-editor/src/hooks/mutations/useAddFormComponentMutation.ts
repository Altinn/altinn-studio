import { IFormComponent, IFormFileUploaderComponent, IFormLayouts, IInternalLayout } from '../../types/global';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { useMutation } from '@tanstack/react-query';
import { generateComponentId } from '../../utils/generateId';
import { ComponentType } from '../../components';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useAddAppAttachmentMetadataMutation } from './useAddAppAttachmentMetadataMutation';
import { addComponent } from '../../utils/formLayoutUtils';

export interface AddFormComponentMutationArgs {
  component: IFormComponent;
  position?: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export const useAddFormComponentMutation = (org: string, app: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName);
  const appAttachmentMetadataMutation = useAddAppAttachmentMetadataMutation(org, app);
  const layouts: IFormLayouts = formLayoutsQuery.data;

  return useMutation({
    mutationFn: ({ component, position, containerId, callback }: AddFormComponentMutationArgs) => {
      const id: string = component.id || generateComponentId(component.type, layouts);
      component.id = id;

      if (!layout) return;
      if (callback) callback(component, id);

      const updatedLayout: IInternalLayout = addComponent(layout, component, containerId, position);

      return formLayoutsMutation.mutateAsync(updatedLayout).then(() => {
        if (component.type === ComponentType.FileUpload) {
          // Todo: Consider to handle this in the backend. It should not be necessary to make two calls.
          const { maxNumberOfAttachments, minNumberOfAttachments, maxFileSizeInMB, validFileEndings } =
            component as IFormFileUploaderComponent;
          appAttachmentMetadataMutation.mutate({
            id,
            maxCount: maxNumberOfAttachments,
            minCount: minNumberOfAttachments,
            fileType: validFileEndings,
            maxSize: maxFileSizeInMB,
          });
        }
        return id; // Returns created id
      });
    }
  })
}
