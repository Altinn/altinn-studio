import React, {
  useState,
  useMemo,
  useCallback,
  createContext,
  useRef,
  useEffect,
  useContext,
} from 'react';

import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import type { UpdateFormContainerMutationArgs } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import type { UpdateFormComponentMutationArgs } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import * as formItemUtils from '../utils/formItemUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useSelectedFormLayout } from '../hooks';
import { getItem } from '../utils/formLayoutUtils';
import { ItemType } from '../components/Properties/ItemType';
import type { MutateOptions } from '@tanstack/react-query';
import useUxEditorParams from '../hooks/useUxEditorParams';
import { useSearchParams } from 'react-router-dom';
import { componentSearchParam } from '../AppContext';

export type FormItemContext = {
  formItemId: string;
  formItem: FormContainer | FormComponent;
  handleDiscard: () => void;
  handleEdit: (updatedForm: FormContainer | FormComponent) => void;
  handleUpdate: React.Dispatch<React.SetStateAction<FormContainer | FormComponent>>;
  handleSave: (
    id?: string,
    updatedForm?: FormContainer | FormComponent,
    mutateOptions?: UpdateFormMutateOptions,
  ) => Promise<void>;
  debounceSave: (
    id?: string,
    updatedForm?: FormContainer | FormComponent,
    mutateOptions?: UpdateFormMutateOptions,
  ) => Promise<void>;
};

export const FormItemContext = createContext<FormItemContext>({
  formItemId: undefined,
  formItem: undefined,
  handleDiscard: undefined,
  handleEdit: undefined,
  handleUpdate: undefined,
  handleSave: undefined,
  debounceSave: undefined,
});

export type UpdateFormMutateOptions = MutateOptions<
  { currentId: string; newId: string },
  Error,
  UpdateFormContainerMutationArgs | UpdateFormComponentMutationArgs,
  unknown
>;

export const useFormItemContext = function () {
  const context = useContext(FormItemContext);
  if (context === undefined) {
    throw new Error('useFormItemContext must be used within a FormItemContextProvider.');
  }
  return context;
};

type FormItemContextProviderProps = {
  children: React.ReactNode;
};

export const FormItemContextProvider = ({
  children,
}: FormItemContextProviderProps): React.JSX.Element => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutName, setSelectedItem, updateLayoutsForPreview } = useAppContext();
  const selectedFormLayout = useSelectedFormLayout();
  const [searchParams] = useSearchParams();
  const { layoutSet } = useUxEditorParams();

  const prevSelectedFormLayoutSetNameRef = useRef(layoutSet);
  const prevSelectedFormLayoutNameRef = useRef(selectedFormLayoutName);

  const autoSaveTimeoutRef = useRef(undefined);

  const [formItemId, setFormItemId] = useState<string>();
  const [formItem, setFormItem] = useState<FormContainer | FormComponent>();
  const formItemIdRef = useRef<string>(formItemId);
  const formItemRef = useRef<FormContainer | FormComponent>(formItem);

  // Only a component selected through the URL when the editor opens is restored. Once an item has been
  // edited, a missing item was discarded, for example deleted, and stays discarded. The ID is read from
  // the URL rather than selectedItem, which ComponentConfigPanel clears if it renders before the pages load.
  const canRestoreSelectedComponentRef = useRef(true);
  const componentIdFromUrl = searchParams.get(componentSearchParam);
  const selectedComponentToRestore =
    canRestoreSelectedComponentRef.current && !formItemId && componentIdFromUrl
      ? getItem(selectedFormLayout, componentIdFromUrl)
      : undefined;

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(
    org,
    app,
    prevSelectedFormLayoutNameRef.current,
    prevSelectedFormLayoutSetNameRef.current,
  );
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(
    org,
    app,
    prevSelectedFormLayoutNameRef.current,
    prevSelectedFormLayoutSetNameRef.current,
  );

  useEffect(() => {
    formItemIdRef.current = formItemId;
    formItemRef.current = formItem;
  }, [formItemId, formItem]);

  const handleSave = useCallback(
    async (
      id: string = formItemIdRef.current,
      updatedForm: FormContainer | FormComponent = formItemRef.current,
      mutateOptions?: UpdateFormMutateOptions,
    ): Promise<void> => {
      clearTimeout(autoSaveTimeoutRef.current);
      if (updatedForm) {
        const hasNewId = id !== updatedForm.id;

        const mutationOptions = {
          onSuccess: async () => {
            await updateLayoutsForPreview(layoutSet, hasNewId);
          },
          ...mutateOptions,
        };

        if (formItemUtils.isContainer(updatedForm)) {
          await updateFormContainer({ id, updatedContainer: updatedForm }, mutationOptions);
        } else {
          await updateFormComponent({ id, updatedComponent: updatedForm }, mutationOptions);
        }

        if (hasNewId) {
          setFormItemId(updatedForm.id);
        }
      }
    },
    [updateLayoutsForPreview, layoutSet, updateFormComponent, updateFormContainer],
  );

  const handleEdit = useCallback((updatedForm: FormContainer | FormComponent): void => {
    if (updatedForm) canRestoreSelectedComponentRef.current = false;
    setFormItemId(updatedForm?.id);
    setFormItem(updatedForm);
  }, []);

  const handleDiscard = useCallback((): void => {
    clearTimeout(autoSaveTimeoutRef.current);
    handleEdit(undefined);
  }, [handleEdit]);

  const debounceSave = useCallback(
    async (
      id: string,
      updatedForm: FormContainer | FormComponent,
      mutateOptions?: UpdateFormMutateOptions,
    ): Promise<void> => {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        await handleSave(id, updatedForm, mutateOptions);
      }, AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    },
    [handleSave],
  );

  useEffect(() => {
    const autoSaveOnLayoutChange = async () => {
      // Without an item there is nothing to save, and awaiting would delay the discard past the restore below.
      if (
        formItemRef.current &&
        prevSelectedFormLayoutSetNameRef.current === layoutSet &&
        prevSelectedFormLayoutNameRef.current !== selectedFormLayoutName
      ) {
        await handleSave();
      }
      handleDiscard();
      prevSelectedFormLayoutSetNameRef.current = layoutSet;
      prevSelectedFormLayoutNameRef.current = selectedFormLayoutName;
    };

    autoSaveOnLayoutChange();
  }, [handleDiscard, handleSave, layoutSet, selectedFormLayoutName]);

  // Declared after the effect above, so the restored item is not saved by its page change.
  useEffect(() => {
    if (!selectedComponentToRestore) return;
    handleEdit(selectedComponentToRestore);
    setSelectedItem({ type: ItemType.Component, id: selectedComponentToRestore.id });
  }, [selectedComponentToRestore, handleEdit, setSelectedItem]);

  const value = useMemo(
    () => ({
      formItemId: formItemId ?? selectedComponentToRestore?.id,
      formItem: formItem ?? selectedComponentToRestore,
      handleDiscard,
      handleUpdate: setFormItem,
      handleEdit,
      handleSave,
      debounceSave,
    }),
    [
      formItemId,
      formItem,
      selectedComponentToRestore,
      handleDiscard,
      handleEdit,
      handleSave,
      debounceSave,
    ],
  );

  return <FormItemContext.Provider value={value}>{children}</FormItemContext.Provider>;
};
