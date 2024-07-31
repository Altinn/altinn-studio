import React, { useState, useMemo, createContext, useContext, useEffect } from 'react';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import {
  useUpdateFormContainerMutation,
  type UpdateFormContainerMutationArgs,
} from '../hooks/mutations/useUpdateFormContainerMutation';
import {
  useUpdateFormComponentMutation,
  type UpdateFormComponentMutationArgs,
} from '../hooks/mutations/useUpdateFormComponentMutation';
import type { MutateOptions } from '@tanstack/react-query';
import { LayoutItemType } from '@altinn/ux-editor/types/global';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDebounce } from '@studio/components';

export type FormItemContext = {
  formItemId: string;
  setFormItemId: (id: string) => void;
  formItem: FormContainer | FormComponent;
  setFormItem: (formItem: FormContainer | FormComponent) => void;
};

export const FormItemContext = createContext<FormItemContext>({
  formItemId: undefined,
  setFormItemId: undefined,
  formItem: undefined,
  setFormItem: undefined,
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
  const [formItemId, setFormItemId] = useState<string>();
  const [formItem, setFormItem] = useState<FormContainer | FormComponent>();

  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName, refetchLayouts } = useAppContext();
  const { mutateAsync: updateFormContainer } = useUpdateFormContainerMutation(
    org,
    app,
    selectedFormLayoutName,
    selectedFormLayoutSetName,
  );
  const { mutateAsync: updateFormComponent } = useUpdateFormComponentMutation(
    org,
    app,
    selectedFormLayoutName,
    selectedFormLayoutSetName,
  );

  useEffect(() => {
    debounce(async () => {
      if (!formItemId) return;
      if (formItem?.itemType === LayoutItemType.Container) {
        await updateFormContainer({ id: formItemId, updatedContainer: formItem });
      } else {
        await updateFormComponent({ id: formItemId, updatedComponent: formItem });
      }
      setFormItem(formItem);
      setFormItemId(formItem.id);
      refetchLayouts(selectedFormLayoutSetName, true);
    });
  }, [formItem]);

  // TODO: can formId be omitted?
  const value = useMemo(
    () => ({
      formItemId,
      setFormItemId,
      formItem,
      setFormItem,
    }),
    [formItemId, formItem],
  );

  return <FormItemContext.Provider value={value}>{children}</FormItemContext.Provider>;
};
