import React, { useState, useMemo, useCallback, createContext, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { selectedLayoutSetSelector, selectedLayoutNameSelector } from '../selectors/formLayoutSelectors';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { LayoutItemType } from '../types/global';

export type FormContext = {
  formId: string;
  form:  FormContainer | FormComponent;
  handleDiscard: () => void;
  handleEdit: (updatedForm: FormContainer | FormComponent) => void;
  handleUpdate: React.Dispatch<React.SetStateAction<FormContainer | FormComponent>>;
  handleSave: (id?: string, updatedForm?: FormContainer | FormComponent) => Promise<void>;
  debounceSave: (id?: string, updatedForm?: FormContainer | FormComponent) => Promise<void>;
}

export const FormContext = createContext<FormContext>({
  formId: undefined,
  form: undefined,
  handleDiscard: undefined,
  handleEdit: undefined,
  handleUpdate: undefined,
  handleSave: undefined,
  debounceSave: undefined,
});

type FormContextProviderProps = {
  children: React.ReactNode;
};

export const FormContextProvider = ({ children }: FormContextProviderProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useParams();
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const prevSelectedLayoutNameRef = useRef(selectedLayoutName);

  const autoSaveTimeoutRef = useRef(undefined);

  const [formId, setFormId] = useState<string>();
  const [form, setForm] = useState<FormContainer | FormComponent>();
  const formIdRef = useRef<string>(formId);
  const formRef = useRef<FormContainer | FormComponent>(form);

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(org, app, prevSelectedLayoutNameRef.current, selectedLayoutSetName);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app, prevSelectedLayoutNameRef.current, selectedLayoutSetName);

  useEffect(() => {
    formIdRef.current = formId;
    formRef.current = form;
  }, [formId, form]);

  const handleContainerSave = useCallback(async (id: string, updatedContainer: FormContainer): Promise<void> => {
    await updateFormContainer({
      id,
      updatedContainer,
    });
    if (id !== updatedContainer.id) {
      setFormId(updatedContainer.id);
    }
  }, [updateFormContainer]);

  const handleComponentSave = useCallback(async (id: string, updatedComponent: FormComponent): Promise<void> => {
    await updateFormComponent({
      id,
      updatedComponent,
    })
    if (id !== updatedComponent.id) {
      setFormId(updatedComponent.id);
    }
  }, [updateFormComponent]);

  const handleSave = useCallback(async (id: string = formIdRef.current, updatedForm: FormContainer | FormComponent = formRef.current): Promise<void> => {
    clearTimeout(autoSaveTimeoutRef.current);
    if (updatedForm) {
      if (updatedForm.itemType === LayoutItemType.Container) {
        await handleContainerSave(id, updatedForm as FormContainer);
      } else {
        await handleComponentSave(id, updatedForm as FormComponent);
      }
    }
  }, [handleComponentSave, handleContainerSave]);

  const handleEdit = useCallback((updatedForm: FormContainer | FormComponent): void => {
    dispatch(setCurrentEditId(undefined));
    setFormId(updatedForm?.id);
    setForm(updatedForm);
  }, [dispatch]);

  const handleDiscard = useCallback((): void => {
    clearTimeout(autoSaveTimeoutRef.current);
    handleEdit(undefined);
  }, [handleEdit]);

  const debounceSave = useCallback(async (id: string = formIdRef.current, updatedForm: FormContainer | FormComponent = formRef.current): Promise<void> => {
    clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      await handleSave(id, updatedForm);
    }, AUTOSAVE_DEBOUNCE_INTERVAL);
  }, [handleSave]);

  useEffect(() => {
    const autoSaveOnLayoutChange = async () => {
      if (prevSelectedLayoutNameRef.current === selectedLayoutName) return;
      await handleSave();
      handleDiscard();
      prevSelectedLayoutNameRef.current = selectedLayoutName;
    };

    autoSaveOnLayoutChange();
  }, [handleDiscard, handleSave, selectedLayoutName]);

  const value = useMemo(() => ({
    formId,
    form,
    handleDiscard,
    handleUpdate: setForm,
    handleEdit,
    handleSave,
    debounceSave,
  }), [formId, form, handleDiscard, handleEdit, handleSave, debounceSave]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};
