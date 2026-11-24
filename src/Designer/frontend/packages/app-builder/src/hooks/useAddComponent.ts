import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations/useUpsertTextResourcesMutation';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations/useUpdateOptionListMutation';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { Option } from 'app-shared/types/Option';
import { EDITOR_LANGUAGE } from '../constants';
import type { LayoutComponent, PageLayout, TextsById } from '../types';
import { setField } from '../utils/dataModelUtils';
import { insertComponent } from '../utils/layoutUtils';
import type { Placement } from '../utils/layoutUtils';
import { useAddAttachmentDataTypeMutation } from './useAttachmentDataTypeMutations';
import type { DataModel } from './useDataModelQuery';
import { useSaveDataModelMutation } from './useSaveDataModelMutation';
import { useSavePageLayoutMutation } from './useSavePageLayoutMutation';

export type AddComponentArgs = {
  component: LayoutComponent;
  texts: TextsById;
  placement: Placement;
  /** A field to create in the data model before the component is saved. */
  newField?: { name: string; schema: JsonSchema; dataModel: DataModel };
  /** A code list the component uses that the app does not have yet. */
  newCodeList?: { id: string; options: Option[] };
  /** The data type a file upload saves its attachments as. */
  newAttachmentDataType?: ApplicationAttachmentMetadata;
};

/**
 * Adds a component with what it depends on: texts, and for some types a data model field, a code
 * list or an attachment data type. The backend saves these separately and without a transaction, so
 * the layout is saved last and only if the rest succeeded, so it never points to something that does
 * not exist. Returns whether the component was added; the error itself is shown by the global error
 * handler of the services context.
 */
export const useAddComponent = (
  org: string,
  app: string,
  layoutSetName: string,
  pageName: string,
  layout: PageLayout,
  /** Components the builder keeps in place, which what is added at the end goes above. */
  fixedIds: Set<string>,
) => {
  const { mutateAsync: saveDataModel } = useSaveDataModelMutation(org, app);
  const { mutateAsync: upsertTextResources } = useUpsertTextResourcesMutation(org, app);
  const { mutateAsync: saveCodeList } = useUpdateOptionListMutation(org, app);
  const { mutateAsync: addAttachmentDataType } = useAddAttachmentDataTypeMutation(org, app);
  const { mutateAsync: savePageLayout } = useSavePageLayoutMutation(org, app, layoutSetName);

  const saveAll = async ({
    component,
    texts,
    placement,
    newField,
    newCodeList,
    newAttachmentDataType,
  }: AddComponentArgs): Promise<void> => {
    if (newField) {
      const { name, schema, dataModel } = newField;
      await saveDataModel({
        modelPath: dataModel.modelPath,
        schema: setField(dataModel.schema, name, schema),
      });
    }
    if (newCodeList) {
      await saveCodeList({ optionListId: newCodeList.id, optionList: newCodeList.options });
    }
    if (newAttachmentDataType) await addAttachmentDataType(newAttachmentDataType);
    await upsertTextResources({
      language: EDITOR_LANGUAGE,
      textResources: Object.entries(texts).map(([id, value]) => ({ id, value })),
    });
    await savePageLayout({
      pageName,
      layout: insertComponent(layout, component, placement, fixedIds),
    });
  };

  return async (args: AddComponentArgs): Promise<boolean> => {
    try {
      await saveAll(args);
      return true;
    } catch {
      return false;
    }
  };
};
