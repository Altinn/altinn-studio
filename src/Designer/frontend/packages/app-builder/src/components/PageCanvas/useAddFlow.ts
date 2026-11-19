import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useAddComponent } from '../../hooks/useAddComponent';
import type { AddComponentArgs } from '../../hooks/useAddComponent';
import { setRequiredValue } from '../../utils/componentUtils';
import { toAttachmentDataType } from '../../utils/fileUploadUtils';
import type { Placement } from '../../utils/layoutUtils';
import {
  createNewComponent,
  generateComponentId,
  getSchemaFieldForType,
  hasOptions,
  isQuestionType,
  savesToDataModel,
} from '../../utils/newComponentUtils';
import type { AddableComponentType, QuestionComponentType } from '../../utils/newComponentUtils';
import { hasCodeList, YES_NO_CODE_LIST_ID, yesNoOptions } from '../../utils/optionUtils';
import type { NewComponentValues } from '../NewComponentForm/NewComponentForm';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';

export type AddFlow = {
  isSaving: boolean;
  /** The component that was just added, whose text should be edited first. */
  addedComponentId?: string;
  chooseType: (type: AddableComponentType, placement: Placement) => void;
  addQuestion: (values: NewComponentValues) => Promise<void>;
  clearAddedComponent: () => void;
};

/**
 * Adds what the user chooses in the add box. Texts and groups are added straight away with a
 * default text the user changes in place. Questions first ask for a label, since the label names
 * the data model field the answer is saved in, and for an optional description and the options.
 */
export const useAddFlow = (): AddFlow => {
  const { t } = useTranslation();
  const { org, app, layoutSetName, layouts, dataModel, codeLists, taskId } = useAppBuilder();
  const { pageName, layout, fixedIds } = usePageEditing();
  const { newQuestion, startNewQuestion, stopAdding, selectComponent } = useCanvasState();
  const addComponent = useAddComponent(org, app, layoutSetName, pageName, layout, fixedIds);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [addedComponentId, setAddedComponentId] = useState<string>();

  const defaultOptionTexts = [1, 2].map((number) =>
    t('app_builder.default_text.option', { number }),
  );

  const add = async (args: AddComponentArgs): Promise<boolean> => {
    setIsSaving(true);
    const isAdded = await addComponent(args);
    setIsSaving(false);
    if (isAdded) {
      stopAdding();
      selectComponent(args.component.id);
    }
    return isAdded;
  };

  const chooseType = (type: AddableComponentType, placement: Placement): void => {
    if (isQuestionType(type)) {
      startNewQuestion({ type, placement });
      return;
    }
    void addWithDefaultText(type, placement);
  };

  const addWithDefaultText = async (
    type: AddableComponentType,
    placement: Placement,
  ): Promise<void> => {
    const componentId = generateComponentId(type, layouts);
    const { component, texts } = createNewComponent({
      type,
      componentId,
      pageName,
      text: t(`app_builder.default_text.${type}`),
    });
    if (await add({ component, texts, placement })) setAddedComponentId(componentId);
  };

  const addQuestion = async ({
    label,
    description,
    options,
    fieldName,
    required,
  }: NewComponentValues): Promise<void> => {
    if (!newQuestion) return;
    const { type, placement } = newQuestion;
    const optionTexts = getOptionTexts(type, options);
    const componentId = generateComponentId(type, layouts);
    const binding =
      dataModel && fieldName ? { field: fieldName, dataType: dataModel.dataType } : undefined;
    const created = createNewComponent({
      type,
      componentId,
      pageName,
      text: label,
      description,
      optionTexts,
      binding,
    });
    const component = setRequiredValue(created.component, required);
    await add({
      component,
      texts: created.texts,
      placement,
      newField:
        binding && savesToDataModel(type)
          ? { name: fieldName, schema: getSchemaFieldForType(type), dataModel }
          : undefined,
      newCodeList: needsYesNoList(type, optionTexts)
        ? { id: YES_NO_CODE_LIST_ID, options: yesNoOptions }
        : undefined,
      newAttachmentDataType:
        type === ComponentType.FileUpload ? toAttachmentDataType(component, taskId) : undefined,
    });
  };

  // A radio button question without its own options asks yes or no. A checkbox list or dropdown
  // whose options were left empty gets example options, which the user renames in place.
  const getOptionTexts = (
    type: QuestionComponentType,
    options: string[] | undefined,
  ): string[] | undefined => {
    if (!hasOptions(type)) return undefined;
    if (options?.length) return options;
    return type === ComponentType.RadioButtons && !options ? undefined : defaultOptionTexts;
  };

  const needsYesNoList = (type: QuestionComponentType, optionTexts?: string[]): boolean =>
    type === ComponentType.RadioButtons &&
    !optionTexts &&
    !hasCodeList(codeLists, YES_NO_CODE_LIST_ID);

  return {
    isSaving,
    addedComponentId,
    chooseType,
    addQuestion,
    clearAddedComponent: () => setAddedComponentId(undefined),
  };
};
