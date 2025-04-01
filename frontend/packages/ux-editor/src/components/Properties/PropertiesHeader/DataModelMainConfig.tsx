import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import React from 'react';
import { EditDataModelBinding } from '../../config/editModal/EditDataModelBinding/EditDataModelBinding';
import { useFormItemContext } from '@altinn/ux-editor/containers/FormItemContext';

type DataModelMainConfigProps = {
  component: FormItem;
  requiredDataModelBindings: string[];
  handleComponentChange: (component: FormItem) => void;
};

export const DataModelMainConfig = ({
  component,
  requiredDataModelBindings,
  handleComponentChange,
}: DataModelMainConfigProps): React.ReactElement[] => {
  const { debounceSave } = useFormItemContext();

  if (!requiredDataModelBindings) {
    return null;
  }

  return requiredDataModelBindings.map((dataModelBindingKey) => (
    <EditDataModelBinding
      key={`${component.id}- ${dataModelBindingKey}`}
      component={component}
      handleComponentChange={async (updatedComponent, mutateOptions) => {
        handleComponentChange(updatedComponent);
        debounceSave(component.id, updatedComponent, mutateOptions);
      }}
      editFormId={component.id}
      renderOptions={{
        key: dataModelBindingKey,
        label: dataModelBindingKey !== 'simpleBinding' ? dataModelBindingKey : undefined,
      }}
    />
  ));
};
