import React, { useState, useMemo, useCallback, createContext } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { IFormContainer } from '../types/global';
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
  form:  IFormContainer | FormComponent;
  handleDiscard: () => void;
  handleEdit: (component: IFormContainer | FormComponent) => void;
  handleUpdate: React.Dispatch<React.SetStateAction<IFormContainer | FormComponent>>;
  handleContainerSave: (id: string, updatedContainer: IFormContainer) => Promise<void>;
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
  const [form, setForm] = useState<IFormContainer | FormComponent>();

  const { data: ruleConfig } = useRuleConfigQuery(org, app);
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(org, app);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app);
  const { components } = useFormLayoutsSelector(selectedLayoutSelector);

  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(org, app);
  const { mutateAsync: updateContainerId } = useUpdateContainerIdMutation(org, app);

  const handleDiscard = useCallback((): void => {
    handleEdit(null);
  }, []);

  const handleEdit = useCallback((component: IFormContainer | FormComponent): void => {
    dispatch(setCurrentEditId(undefined));
    setFormId(component?.id);
    setForm(component);
  }, []);

  const handleContainerSave = useCallback(async (id: string, updatedContainer: IFormContainer): Promise<void> => {
    await updateFormContainer({
      updatedContainer,
      id,
    });
    if (id !== updatedContainer.id) {
      await updateContainerId({
        currentId: id,
        newId: updatedContainer.id,
      });
    }
    handleDiscard();
  }, []);

  const handleComponentSave = useCallback(async (id: string, updatedComponent: FormComponent): Promise<void> => {
    const component: FormComponent = components[formId];

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
  }, [components]);

  const value = useMemo(() => ({
    formId,
    form,
    handleDiscard,
    handleUpdate: setForm,
    handleEdit,
    handleContainerSave,
    handleComponentSave,
  }), [formId, form]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};
