import React, { useState, useMemo, useCallback, createContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { selectedLayoutSetSelector } from '../selectors/formLayoutSelectors';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { LayoutItemType } from '../types/global';

export type FormContext = {
  formId: string;
  form:  FormContainer | FormComponent;
  handleDiscard: () => void;
  handleEdit: (updatedForm: FormContainer | FormComponent) => Promise<void>;
  handleUpdate: React.Dispatch<React.SetStateAction<FormContainer | FormComponent>>;
  handleContainerSave: (id: string, updatedContainer: FormContainer) => void;
  handleComponentSave: (id: string, updatedComponent: FormComponent) => void;
}

export const FormContext = createContext<FormContext>({
  formId: undefined,
  form: undefined,
  handleDiscard: undefined,
  handleEdit: undefined,
  handleUpdate: undefined,
  handleContainerSave: undefined,
  handleComponentSave: undefined,
});

type FormContextProviderProps = {
  children: React.ReactNode;
};

const debounceAutoSave = (
  timeoutRef: React.MutableRefObject<any>,
  callback: (id: string, updatedForm: FormContainer | FormComponent) => Promise<void>,
  id: string,
  updatedForm: FormContainer | FormComponent
): void => {
  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(async () => {
    clearTimeout(timeoutRef.current);
    await callback(id, updatedForm);
  }, AUTOSAVE_DEBOUNCE_INTERVAL);
};

export const FormContextProvider = ({ children }: FormContextProviderProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useParams();
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);

  const autoSaveTimeoutRef = useRef();

  const [formId, setFormId] = useState<string>();
  const [form, setForm] = useState<FormContainer | FormComponent>();

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(org, app, selectedLayoutSetName);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app, selectedLayoutSetName);

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

  const handleSave = useCallback(async (id: string, updatedForm: FormContainer | FormComponent): Promise<void> => {
    if (updatedForm) {
      if (updatedForm.itemType === LayoutItemType.Container) {
        await handleContainerSave(id, updatedForm as FormContainer);
      } else {
        await handleComponentSave(id, updatedForm as FormComponent);
      }
    }
  }, [handleComponentSave, handleContainerSave]);

  const handleEdit = useCallback(async (updatedForm: FormContainer | FormComponent): Promise<void> => {
    dispatch(setCurrentEditId(undefined));
    setFormId(updatedForm?.id);
    setForm(updatedForm);
  }, [dispatch]);

  const handleSaveAndEdit = useCallback(async (updatedForm: FormContainer | FormComponent): Promise<void> => {
    clearTimeout(autoSaveTimeoutRef.current);
    await handleSave(formId, form);
    handleEdit(updatedForm);
  }, [form, formId, handleSave, handleEdit]);

  const handleDiscard = useCallback((): void => {
    clearTimeout(autoSaveTimeoutRef.current);
    handleEdit(undefined);
  }, [handleEdit]);

  const value = useMemo(() => ({
    formId,
    form,
    handleDiscard,
    handleUpdate: setForm,
    handleEdit: handleSaveAndEdit,
    handleContainerSave: (id: string, updatedContainer: FormContainer) => debounceAutoSave(autoSaveTimeoutRef, handleContainerSave, id, updatedContainer),
    handleComponentSave: (id: string, updatedComponent: FormComponent) => debounceAutoSave(autoSaveTimeoutRef, handleComponentSave, id, updatedComponent),
  }), [formId, form, handleDiscard, handleSaveAndEdit, handleContainerSave, handleComponentSave]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};
