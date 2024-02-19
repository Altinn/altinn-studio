import React, {
  useState,
  useMemo,
  useCallback,
  createContext,
  useRef,
  useEffect,
  useContext,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { selectedLayoutNameSelector } from '../selectors/formLayoutSelectors';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { LayoutItemType } from '../types/global';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../hooks/useAppContext';
import {FormItem} from "../types/FormItem";

export type FormContext = {
  formId: string;
  form: FormItem;
  handleDiscard: () => void;
  handleEdit: (updatedForm: FormItem) => void;
  handleUpdate: React.Dispatch<React.SetStateAction<FormItem>>;
  handleSave: (id?: string, updatedForm?: FormItem) => Promise<void>;
  debounceSave: (id?: string, updatedForm?: FormItem) => Promise<void>;
};

export const FormContext = createContext<FormContext>({
  formId: undefined,
  form: undefined,
  handleDiscard: undefined,
  handleEdit: undefined,
  handleUpdate: undefined,
  handleSave: undefined,
  debounceSave: undefined,
});

export const useFormContext = function () {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormContextProvider.');
  }
  return context;
};

type FormContextProviderProps = {
  children: React.ReactNode;
};

export const FormContextProvider = ({ children }: FormContextProviderProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const prevSelectedLayoutSetNameRef = useRef(selectedLayoutSet);
  const prevSelectedLayoutNameRef = useRef(selectedLayoutName);

  const autoSaveTimeoutRef = useRef(undefined);

  const [formId, setFormId] = useState<string>();
  const [form, setForm] = useState<FormItem>();
  const formIdRef = useRef<string>(formId);
  const formRef = useRef<FormItem>(form);

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(
    org,
    app,
    prevSelectedLayoutNameRef.current,
    selectedLayoutSet,
  );
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(
    org,
    app,
    prevSelectedLayoutNameRef.current,
    selectedLayoutSet,
  );

  useEffect(() => {
    formIdRef.current = formId;
    formRef.current = form;
  }, [formId, form]);

  const handleContainerSave = useCallback(
    async (id: string, updatedContainer: FormContainer): Promise<void> => {
      await updateFormContainer({
        id,
        updatedContainer,
      });
      if (id !== updatedContainer.id) {
        setFormId(updatedContainer.id);
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
        setFormId(updatedComponent.id);
      }
    },
    [updateFormComponent],
  );

  const handleSave = useCallback(
    async (
      id: string = formIdRef.current,
      updatedForm: FormItem = formRef.current,
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

  const handleEdit = useCallback(
    (updatedForm: FormItem): void => {
      dispatch(setCurrentEditId(undefined));
      setFormId(updatedForm?.id);
      setForm(updatedForm);
    },
    [dispatch],
  );

  const handleDiscard = useCallback((): void => {
    clearTimeout(autoSaveTimeoutRef.current);
    handleEdit(undefined);
  }, [handleEdit]);

  const debounceSave = useCallback(
    async (id: string, updatedForm: FormItem): Promise<void> => {
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
        prevSelectedLayoutSetNameRef.current === selectedLayoutSet &&
        prevSelectedLayoutNameRef.current === selectedLayoutName
      )
        return;
      await handleSave();
      handleDiscard();
      prevSelectedLayoutSetNameRef.current = selectedLayoutName;
      prevSelectedLayoutNameRef.current = selectedLayoutName;
    };

    autoSaveOnLayoutChange();
  }, [handleDiscard, handleSave, selectedLayoutSet, selectedLayoutName]);

  const value = useMemo(
    () => ({
      formId,
      form,
      handleDiscard,
      handleUpdate: setForm,
      handleEdit,
      handleSave,
      debounceSave,
    }),
    [formId, form, handleDiscard, handleEdit, handleSave, debounceSave],
  );

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};
