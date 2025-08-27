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
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../hooks/useAppContext';

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
    throw new Error('useFormContext must be used within a FormContextProvider.');
  }
  return context;
};

type FormItemContextProviderProps = {
  children: React.ReactNode;
};

export const FormItemContextProvider = ({
  children,
}: FormItemContextProviderProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  const selectedLayoutName = useSelector(selectedLayoutNameSelector);
  const prevSelectedLayoutSetNameRef = useRef(selectedLayoutSet);
  const prevSelectedLayoutNameRef = useRef(selectedLayoutName);

  const autoSaveTimeoutRef = useRef(undefined);

  const [formItemId, setFormItemId] = useState<string>();
  const [formItem, setFormItem] = useState<FormContainer | FormComponent>();
  const formItemIdRef = useRef<string>(formItemId);
  const formItemRef = useRef<FormContainer | FormComponent>(formItem);

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

  const handleEdit = useCallback(
    (updatedForm: FormContainer | FormComponent): void => {
      dispatch(setCurrentEditId(undefined));
      setFormItemId(updatedForm?.id);
      setFormItem(updatedForm);
    },
    [dispatch],
  );

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
