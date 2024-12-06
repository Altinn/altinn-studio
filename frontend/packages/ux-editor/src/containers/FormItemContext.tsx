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
import { LayoutItemType } from '../types/global';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../hooks';
import type { MutateOptions } from '@tanstack/react-query';

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
  const { selectedFormLayoutSetName, selectedFormLayoutName, updateLayoutsForPreview } =
    useAppContext();
  const prevSelectedFormLayoutSetNameRef = useRef(selectedFormLayoutSetName);
  const prevSelectedFormLayoutNameRef = useRef(selectedFormLayoutName);

  const autoSaveTimeoutRef = useRef(undefined);

  const [formItemId, setFormItemId] = useState<string>();
  const [formItem, setFormItem] = useState<FormContainer | FormComponent>();
  const formItemIdRef = useRef<string>(formItemId);
  const formItemRef = useRef<FormContainer | FormComponent>(formItem);

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
            await updateLayoutsForPreview(selectedFormLayoutSetName, hasNewId);
          },
          ...mutateOptions,
        };

        if (updatedForm.itemType === LayoutItemType.Container) {
          await updateFormContainer({ id, updatedContainer: updatedForm }, mutationOptions);
        } else {
          await updateFormComponent({ id, updatedComponent: updatedForm }, mutationOptions);
        }

        if (hasNewId) {
          setFormItemId(updatedForm.id);
        }
      }
    },
    [updateLayoutsForPreview, selectedFormLayoutSetName, updateFormComponent, updateFormContainer],
  );

  const handleEdit = useCallback((updatedForm: FormContainer | FormComponent): void => {
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
      if (
        prevSelectedFormLayoutSetNameRef.current === selectedFormLayoutSetName &&
        prevSelectedFormLayoutNameRef.current !== selectedFormLayoutName
      ) {
        await handleSave();
      }
      handleDiscard();
      prevSelectedFormLayoutSetNameRef.current = selectedFormLayoutSetName;
      prevSelectedFormLayoutNameRef.current = selectedFormLayoutName;
    };

    autoSaveOnLayoutChange();
  }, [handleDiscard, handleSave, selectedFormLayoutSetName, selectedFormLayoutName]);

  const value = useMemo(
    () => ({
      formItemId,
      formItem,
      handleDiscard,
      handleUpdate: setFormItem,
      handleEdit,
      handleSave,
      debounceSave,
    }),
    [formItemId, formItem, handleDiscard, handleEdit, handleSave, debounceSave],
  );

  return <FormItemContext.Provider value={value}>{children}</FormItemContext.Provider>;
};
