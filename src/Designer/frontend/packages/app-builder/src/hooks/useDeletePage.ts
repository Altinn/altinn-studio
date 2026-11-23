import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppBuilder } from '../contexts/AppBuilderContext';
import { removeFields } from '../utils/dataModelUtils';
import { withComponents } from '../utils/layoutUtils';
import { forgetPageInPdfSettings } from '../utils/pageUtils';
import { useDeleteAttachmentDataTypeMutation } from './useAttachmentDataTypeMutations';
import { useDeletePageMutation } from './usePageMutations';
import { useDeleteTextsMutation } from './useDeleteTextsMutation';
import { useSaveDataModelMutation } from './useSaveDataModelMutation';
import { useSaveLayoutSettingsMutation } from './useSaveLayoutSettingsMutation';
import { useSavePageLayoutMutation } from './useSavePageLayoutMutation';

export type DeletePageArgs = {
  pageName: string;
  textKeysToDelete: string[];
  fieldNamesToDelete: string[];
};

/**
 * Deletes a page and what goes with it, as deleting its components one by one would. The page is
 * first saved without its components, so the backend updates references to them, then the texts,
 * fields and attachment data types are removed, and the page last. If a step fails, the page is
 * kept, and what was removed before is unused. Returns whether everything was deleted; the error
 * itself is shown by the global error handler of the services context.
 */
export const useDeletePage = () => {
  const { org, app, layoutSetName, layouts, dataModel } = useAppBuilder();
  const { mutateAsync: savePageLayout } = useSavePageLayoutMutation(org, app, layoutSetName);
  const { mutateAsync: deleteAttachmentDataType } = useDeleteAttachmentDataTypeMutation(org, app);
  const { mutateAsync: deleteTexts } = useDeleteTextsMutation(org, app);
  const { mutateAsync: saveDataModel } = useSaveDataModelMutation(org, app);
  const { mutateAsync: deletePage } = useDeletePageMutation(org, app, layoutSetName);
  const { mutateAsync: saveLayoutSettings } = useSaveLayoutSettingsMutation(
    org,
    app,
    layoutSetName,
  );

  return async ({
    pageName,
    textKeysToDelete,
    fieldNamesToDelete,
  }: DeletePageArgs): Promise<boolean> => {
    const layout = layouts[pageName];
    const components = layout.data.layout;
    try {
      await savePageLayout({
        pageName,
        layout: withComponents(layout, []),
        componentIdsChange: components.map(({ id }) => ({
          oldComponentId: id,
          newComponentId: undefined,
        })),
      });
      // A file upload's attachments are saved as a data type with the same ID as the component.
      const fileUploads = components.filter(({ type }) => type === ComponentType.FileUpload);
      for (const { id } of fileUploads) await deleteAttachmentDataType(id);
      if (textKeysToDelete.length > 0) await deleteTexts(textKeysToDelete);
      if (dataModel && fieldNamesToDelete.length > 0) {
        await saveDataModel({
          modelPath: dataModel.modelPath,
          schema: removeFields(dataModel.schema, fieldNamesToDelete),
        });
      }
      await deletePage(pageName);
      await saveLayoutSettings((settings) => forgetPageInPdfSettings(settings, pageName));
      return true;
    } catch {
      return false;
    }
  };
};
