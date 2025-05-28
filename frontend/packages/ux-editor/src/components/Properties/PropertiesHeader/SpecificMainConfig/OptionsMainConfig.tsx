import React from 'react';
import { EditOptions } from '../../../config/editModal/EditOptions';
import type { FormItem } from '../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../types/FormComponent';

export type OptionsMainConfigProps = {
  component: FormItem<SelectionComponentType>;
  handleComponentChange: (component: FormItem<SelectionComponentType>) => void;
};

export function OptionsMainConfig({
  component,
  handleComponentChange,
}: OptionsMainConfigProps): React.ReactElement {
  return <EditOptions component={component} handleComponentChange={handleComponentChange} />;
}
