import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations/useUpsertTextResourcesMutation';
import { EDITOR_LANGUAGE } from '../constants';
import type { LayoutComponent, PageLayout, TextsById } from '../types';
import { addTextField } from '../utils/dataModelUtils';
import { insertComponent } from '../utils/layoutUtils';
import type { DataModel } from './useDataModelQuery';
import { useSaveDataModelMutation } from './useSaveDataModelMutation';
import { useSavePageLayoutMutation } from './useSavePageLayoutMutation';

export type AddComponentArgs = {
  component: LayoutComponent;
  texts: TextsById;
  position: number;
  /** A field to create in the data model before the component is saved. */
  newField?: { name: string; dataModel: DataModel };
};

/**
 * Adds a component with its texts and, for a data component, its data model field. The backend
 * saves these separately and without a transaction, so the order matters: the field and the texts
 * are saved first, so a saved layout never points to something that does not exist. If an earlier
 * save fails, the layout is not saved. Returns whether the component was added; the error itself is
 * shown by the global error handler of the services context.
 */
export const useAddComponent = (
  org: string,
  app: string,
  layoutSetName: string,
  pageName: string,
  layout: PageLayout,
) => {
  const { mutateAsync: saveDataModel } = useSaveDataModelMutation(org, app);
  const { mutateAsync: upsertTextResources } = useUpsertTextResourcesMutation(org, app);
  const { mutateAsync: savePageLayout } = useSavePageLayoutMutation(org, app, layoutSetName);

  return async ({ component, texts, position, newField }: AddComponentArgs): Promise<boolean> => {
    try {
      await saveAll({ component, texts, position, newField });
      return true;
    } catch {
      return false;
    }
  };

  async function saveAll({
    component,
    texts,
    position,
    newField,
  }: AddComponentArgs): Promise<void> {
    if (newField) {
      const { name, dataModel } = newField;
      await saveDataModel({
        modelPath: dataModel.modelPath,
        schema: addTextField(dataModel.schema, name),
      });
    }
    await upsertTextResources({
      language: EDITOR_LANGUAGE,
      textResources: Object.entries(texts).map(([id, value]) => ({ id, value })),
    });
    await savePageLayout({ pageName, layout: insertComponent(layout, component, position) });
  }
};
