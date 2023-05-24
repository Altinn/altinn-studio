import React, { useState, useMemo, useCallback, createContext } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateContainerIdMutation } from '../hooks/mutations/useUpdateContainerIdMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { useRuleConfigMutation } from '../hooks/mutations/useRuleConfigMutation';
import { useRuleConfigQuery } from '../hooks/queries/useRuleConfigQuery';
import { switchSelectedFieldId } from '../utils/ruleConfigUtils';

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

  const [formId, setFormId] = useState<string>();
  const [form, setForm] = useState<FormContainer | FormComponent>();

  const { data: ruleConfig } = useRuleConfigQuery(org, app);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app);
  const { components } = useFormLayoutsSelector(selectedLayoutSelector);

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(org, app);
  const { mutateAsync: updateContainerId } = useUpdateContainerIdMutation(org, app);

  const handleUpdateFormContainer = useCallback(
    updateFormContainer,
    [updateFormContainer]
  );

  const handleUpdateContainerId = useCallback(
    updateContainerId,
    [updateContainerId]
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
    await handleUpdateFormContainer({
      updatedContainer,
      id,
    });
    if (id !== updatedContainer.id) {
      await handleUpdateContainerId({
        currentId: id,
        newId: updatedContainer.id,
      });
    }
    handleDiscard();
  }, [handleDiscard, handleUpdateContainerId, handleUpdateFormContainer]);

  const handleComponentSave = useCallback(async (id: string, updatedComponent: FormComponent): Promise<void> => {
    const component: FormComponent = components[id];

    if (JSON.stringify(updatedComponent) !== JSON.stringify(component)) {
      await updateFormComponent({
        id,
        updatedComponent,
      });
      if (id !== updatedComponent.id) {
        await switchSelectedFieldId(ruleConfig, id, updatedComponent.id, saveRuleConfig);
      }
    }
    handleDiscard();
  }, [components, handleDiscard, ruleConfig, saveRuleConfig, updateFormComponent]);

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
