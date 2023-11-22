import React from 'react';
import { Switch, Select } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useText } from '../../../../hooks';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import { FormField } from '../../../FormField';

export const PanelComponent = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleShowIconClick = (showIcon: boolean) => {
    handleComponentChange({ ...component, showIcon });
  };

  const handleVariantClick = (variant: FormPanelVariant) => {
    handleComponentChange({ ...component, variant });
  };

  return (
    <>
      <EditTextResourceBinding
        component={component}
        handleComponentChange={handleComponentChange}
        textKey='body'
        labelKey='ux_editor.modal_text_resource_body'
        placeholderKey='ux_editor.modal_text_resource_body_add'
      />
      <FormField
        id={component.id}
        value={component?.showIcon || false}
        onChange={handleShowIconClick}
        propertyPath={`${component.propertyPath}/properties/showIcon`}
        renderField={(props) => (
          <Switch
            {...props}
            size='small'
            onChange={(e) => props.onChange(e.target.checked, e)}
            checked={props.value}
          />
        )}
      />

      <FormField
        id={component.id}
        label={t('ux_editor.choose_variant')}
        value={component.variant || 'info'}
        onChange={handleVariantClick}
        propertyPath={`${component.propertyPath}/properties/variant`}
        renderField={(props) => (
          <Select
            {...props}
            options={Object.values(FormPanelVariant).map((value: FormPanelVariant) => ({
              label: t(`ux_editor.${value}`),
              value,
            }))}
          />
        )}
      />
    </>
  );
};
