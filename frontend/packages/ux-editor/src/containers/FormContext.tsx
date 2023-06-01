import React, { useState, useMemo, useCallback, createContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useFormLayoutsSelector } from '../hooks';
import { selectedLayoutSelector, selectedLayoutSetSelector } from '../selectors/formLayoutSelectors';

export type FormContext = {
  formId: string;
  form:  FormContainer | FormComponent;
  handleDiscard: () => void;
  handleEdit: (component: FormContainer | FormComponent) => void;
  handleUpdate: React.Dispatch<React.SetStateAction<FormContainer | FormComponent>>;
  handleContainerSave: (id: string, updatedContainer: FormContainer) => Promise<void>;
  handleComponentSave: (id: string, updatedComponent: FormComponent) => Promise<void>;
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

export const FormContextProvider = ({ children }: FormContextProviderProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useParams();
  const selectedLayoutSetName = useFormLayoutsSelector(selectedLayoutSetSelector);

  const containerTimeoutRef = useRef(null);
  const componentTimeoutRef = useRef(null);

  const [formId, setFormId] = useState<string>();
  const [form, setForm] = useState<FormContainer | FormComponent>();

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(org, app, selectedLayoutSetName);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app, selectedLayoutSetName);
  const { components } = useFormLayoutsSelector(selectedLayoutSelector);

  const handleUpdateFormContainer = useCallback(
    updateFormContainer,
    [updateFormContainer]
  );

  const handleEdit = useCallback((component: FormContainer | FormComponent): void => {
    dispatch(setCurrentEditId(undefined));
    setFormId(component?.id);
    setForm(component);
  }, [dispatch]);

  const handleDiscard = useCallback((): void => {
    handleEdit(null);
  }, [handleEdit]);

  const handleContainerSave = useCallback(async (id: string, updatedContainer: FormContainer): Promise<void> => {
    clearTimeout(containerTimeoutRef.current);
    containerTimeoutRef.current = setTimeout(async () => {
      clearTimeout(containerTimeoutRef.current);

      await handleUpdateFormContainer({
        id,
        updatedContainer,
      });
      if (id !== updatedContainer.id) {
        setFormId(updatedContainer.id);
      }
    }, 500);
  }, [handleUpdateFormContainer]);

  const handleComponentSave = useCallback(async (id: string, updatedComponent: FormComponent): Promise<void> => {
    clearTimeout(componentTimeoutRef.current);
    componentTimeoutRef.current = setTimeout(async () => {
      clearTimeout(componentTimeoutRef.current);

      const component: FormComponent = components[id];

      if (JSON.stringify(updatedComponent) !== JSON.stringify(component)) {
        await updateFormComponent({
          id,
          updatedComponent,
        })
        if (id !== updatedComponent.id) {
          setFormId(updatedComponent.id);
        }
      }
    }, 500);
  }, [components, updateFormComponent]);

  const value = useMemo(() => ({
    formId,
    form,
    handleDiscard,
    handleUpdate: setForm,
    handleEdit,
    handleContainerSave,
    handleComponentSave,
  }), [formId, form, handleDiscard, handleEdit, handleContainerSave, handleComponentSave]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};
