import React from 'react';
import { EditOptions } from '../../../config/editModal/EditOptions';
import type { FormItem } from '../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../types/FormComponent';
import { useAppContext } from '../../../../hooks';

export type OptionsMainConfigProps = {
  component: FormItem<SelectionComponentType>;
  handleComponentChange: (component: FormItem<SelectionComponentType>) => void;
};

export function OptionsMainConfig({
  component,
  handleComponentChange,
}: OptionsMainConfigProps): React.ReactElement {
  const { selectedFormLayoutName } = useAppContext();
  return (
    <EditOptions
      component={component}
      handleComponentChange={handleComponentChange}
      layoutName={selectedFormLayoutName}
    />
  );
}
