import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import React from 'react';
import { EditDataModelBinding } from '../../config/editModal/EditDataModelBinding/EditDataModelBinding';
import { useFormItemContext } from '@altinn/ux-editor/containers/FormItemContext';

type DataModelMainConfigProps = {
  component: FormItem;
  dataModelBindings: string[];
  handleComponentChange: (component: FormItem) => void;
};

export const DataModelMainConfig = ({
  component,
  dataModelBindings,
  handleComponentChange,
}: DataModelMainConfigProps): React.ReactElement => {
  const { debounceSave } = useFormItemContext();

  const dataModelBindingKey = Object.keys(dataModelBindings || {})[0];

  if (!dataModelBindingKey) {
    return null;
  }

  return (
    <EditDataModelBinding
      component={component}
      handleComponentChange={async (updatedComponent, mutateOptions) => {
        handleComponentChange(updatedComponent);
        debounceSave(component.id, updatedComponent, mutateOptions);
      }}
      editFormId={component.id}
      renderOptions={{
        key: dataModelBindingKey,
        label: dataModelBindingKey !== 'simpleBinding' && dataModelBindingKey,
      }}
    />
  );
};
