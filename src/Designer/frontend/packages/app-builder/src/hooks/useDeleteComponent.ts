import type { PageLayout } from '../types';
import { removeFields } from '../utils/dataModelUtils';
import { getComponentAndDescendantIds, removeComponent } from '../utils/layoutUtils';
import type { DataModel } from './useDataModelQuery';
import { useDeleteTextsMutation } from './useDeleteTextsMutation';
import { useSaveDataModelMutation } from './useSaveDataModelMutation';
import { useSavePageLayoutMutation } from './useSavePageLayoutMutation';

export type DeleteComponentArgs = {
  componentId: string;
  textKeysToDelete: string[];
  fieldNamesToDelete: string[];
};

/**
 * Deletes a component and whatever the user chose to remove with it. The page is saved first, so
 * nothing on it refers to the texts and fields that are removed next. If a later step fails, what is
 * left behind is unused and harmless. Returns whether everything was deleted; the error itself is
 * shown by the global error handler of the services context.
 */
export const useDeleteComponent = (
  org: string,
  app: string,
  layoutSetName: string,
  pageName: string,
  layout: PageLayout,
  dataModel: DataModel | undefined,
) => {
  const { mutateAsync: savePageLayout } = useSavePageLayoutMutation(org, app, layoutSetName);
  const { mutateAsync: deleteTexts } = useDeleteTextsMutation(org, app);
  const { mutateAsync: saveDataModel } = useSaveDataModelMutation(org, app);

  return async ({
    componentId,
    textKeysToDelete,
    fieldNamesToDelete,
  }: DeleteComponentArgs): Promise<boolean> => {
    const removedIds = Array.from(getComponentAndDescendantIds(layout, componentId));
    try {
      await savePageLayout({
        pageName,
        layout: removeComponent(layout, componentId),
        componentIdsChange: removedIds.map((id) => ({
          oldComponentId: id,
          newComponentId: undefined,
        })),
      });
      if (textKeysToDelete.length > 0) await deleteTexts(textKeysToDelete);
      if (dataModel && fieldNamesToDelete.length > 0) {
        await saveDataModel({
          modelPath: dataModel.modelPath,
          schema: removeFields(dataModel.schema, fieldNamesToDelete),
        });
      }
      return true;
    } catch {
      return false;
    }
  };
};
