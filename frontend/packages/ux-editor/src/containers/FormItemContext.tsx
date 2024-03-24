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
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { LayoutItemType } from '../types/global';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext, useSelectedFormLayoutName } from '../hooks';

export type FormItemContext = {
  formItemId: string;
  formItem: FormContainer | FormComponent;
  handleDiscard: () => void;
  handleEdit: (updatedForm: FormContainer | FormComponent) => void;
  handleUpdate: React.Dispatch<React.SetStateAction<FormContainer | FormComponent>>;
  handleSave: (id?: string, updatedForm?: FormContainer | FormComponent) => Promise<void>;
  debounceSave: (id?: string, updatedForm?: FormContainer | FormComponent) => Promise<void>;
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
  const { org, app } = useStudioUrlParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { selectedFormLayoutName } = useSelectedFormLayoutName();
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
    selectedFormLayoutSetName,
  );
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(
    org,
    app,
    prevSelectedFormLayoutNameRef.current,
    selectedFormLayoutSetName,
  );

  useEffect(() => {
    formItemIdRef.current = formItemId;
    formItemRef.current = formItem;
  }, [formItemId, formItem]);

  const handleContainerSave = useCallback(
    async (id: string, updatedContainer: FormContainer): Promise<void> => {
      await updateFormContainer({
        id,
        updatedContainer,
      });
      if (id !== updatedContainer.id) {
        setFormItemId(updatedContainer.id);
      }
    },
    [updateFormContainer],
  );

  const handleComponentSave = useCallback(
    async (id: string, updatedComponent: FormComponent): Promise<void> => {
      await updateFormComponent({
        id,
        updatedComponent,
      });
      if (id !== updatedComponent.id) {
        setFormItemId(updatedComponent.id);
      }
    },
    [updateFormComponent],
  );

  const handleSave = useCallback(
    async (
      id: string = formItemIdRef.current,
      updatedForm: FormContainer | FormComponent = formItemRef.current,
    ): Promise<void> => {
      clearTimeout(autoSaveTimeoutRef.current);
      if (updatedForm) {
        if (updatedForm.itemType === LayoutItemType.Container) {
          await handleContainerSave(id, updatedForm as FormContainer);
        } else {
          await handleComponentSave(id, updatedForm as FormComponent);
        }
      }
    },
    [handleComponentSave, handleContainerSave],
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
    async (id: string, updatedForm: FormContainer | FormComponent): Promise<void> => {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        await handleSave(id, updatedForm);
      }, AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    },
    [handleSave],
  );

  useEffect(() => {
    const autoSaveOnLayoutChange = async () => {
      if (
        prevSelectedFormLayoutSetNameRef.current === selectedFormLayoutSetName &&
        prevSelectedFormLayoutNameRef.current === selectedFormLayoutName
      )
        return;
      await handleSave();
      handleDiscard();
      prevSelectedFormLayoutSetNameRef.current = selectedFormLayoutName;
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
