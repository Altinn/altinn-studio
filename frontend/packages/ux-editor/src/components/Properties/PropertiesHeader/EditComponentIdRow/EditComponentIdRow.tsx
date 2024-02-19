import React from 'react';
import { idExists } from '../../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { useSelectedFormLayout } from '../../../../hooks';
import { FormField } from '../../../FormField';
import { Textfield } from '@digdir/design-system-react';
import {FormItem} from "../../../../types/FormItem";

export interface EditComponentIdRowProps {
  handleComponentUpdate: (component: FormItem) => void;
  component: FormItem;
  helpText?: string;
}
export const EditComponentIdRow = ({
  component,
  handleComponentUpdate,
  helpText,
}: EditComponentIdRowProps) => {
  const { components, containers } = useSelectedFormLayout();
  const { t } = useTranslation();

  const handleIdChange = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  return (
    <FormField
      id={component.id}
      label={t('ux_editor.modal_properties_component_change_id')}
      value={component.id}
      onChange={handleIdChange}
      propertyPath='definitions/component/properties/id'
      componentType={component.type}
      helpText={helpText}
      customValidationRules={(value: string) => {
        if (value !== component.id && idExists(value, components, containers)) {
          return 'unique';
        }
      }}
      customValidationMessages={(errorCode: string) => {
        if (errorCode === 'unique') {
          return t('ux_editor.modal_properties_component_id_not_unique_error');
        }
        if (errorCode === 'pattern') {
          return t('ux_editor.modal_properties_component_id_not_valid');
        }
      }}
      renderField={({ fieldProps }) => (
        <Textfield
          {...fieldProps}
          name={`component-id-input${component.id}`}
          onChange={(e) => fieldProps.onChange(e.target.value, e)}
        />
      )}
    />
  );
};
