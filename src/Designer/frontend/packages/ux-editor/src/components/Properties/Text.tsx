import { useFormItemContext } from '../../containers/FormItemContext';
import { EditTextResourceBindings } from '../config/editModal/EditTextResourceBindings/EditTextResourceBindings';
import type { FormComponent } from '../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useAppContext } from '../../hooks';
import { EditSubformTableColumns } from './EditSubformTableColumns';
import { type FormContainer } from '@altinn/ux-editor/types/FormContainer';
import { getComponentDefinition } from '../../data/componentCatalog';

export const Text = () => {
  const { formItemId: formId, formItem: form, handleUpdate, debounceSave } = useFormItemContext();
  const { selectedFormLayoutName } = useAppContext();
  const textResourceBindings = getComponentDefinition(form.type)?.properties.textResourceBindings;
  const textResourceBindingKeys =
    textResourceBindings?.type === 'object' ? Object.keys(textResourceBindings.properties) : [];

  const handleComponentChange = async (updatedComponent: FormContainer | FormComponent) => {
    handleUpdate(updatedComponent);
    await debounceSave(formId, updatedComponent);
  };

  return (
    <>
      <EditTextResourceBindings
        component={form}
        handleComponentChange={handleComponentChange}
        textResourceBindingKeys={textResourceBindingKeys}
        layoutName={selectedFormLayoutName}
      />
      {form.type === ComponentType.Subform && (
        <EditSubformTableColumns component={form} handleComponentChange={handleComponentChange} />
      )}
    </>
  );
};
