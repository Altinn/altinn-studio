import React, { useState } from 'react';
import { Checkbox } from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../../componentConfig';

export interface CheckboxComponentProps extends IGenericEditComponent {
  label: string;
  defaultValue?: boolean;
  onChangeKey: string;
}
export const CheckboxComponent = ({
  component,
  label,
  onChangeKey,
  defaultValue = false,
  handleComponentChange
}: CheckboxComponentProps): JSX.Element => {
  const [checked, setChecked] = useState<boolean>(defaultValue);

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    setChecked(isChecked);
    handleComponentChange({ ...component, [onChangeKey]: isChecked });
  };

  return <Checkbox label={label} onChange={handleOnChange} checked={checked} />;
};
