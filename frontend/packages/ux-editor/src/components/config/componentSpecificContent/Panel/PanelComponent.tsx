import React from 'react';
import { LegacyCheckbox, Select } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useText } from '../../../../hooks';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { FormPanelVariant } from '../../../../types/FormComponent';
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
    <div data-testid='panel-component-container'>
      <EditTextResourceBinding
        component={component}
        handleComponentChange={handleComponentChange}
        textKey='body'
        labelKey='ux_editor.modal_text_resource_body'
        placeholderKey='ux_editor.modal_text_resource_body_add'
      />
      <FormField
        id={component.id}
        label={t('ux_editor.show_icon')}
        value={component?.showIcon}
        onChange={handleShowIconClick}
        propertyPath={`${component.propertyPath}/properties/showIcon`}
      >
        {({ value, onChange }) => (
          <LegacyCheckbox checked={value} onChange={(e) => onChange(e.target.checked, e)} />
        )}
      </FormField>
      <FormField
        id={component.id}
        label={t('ux_editor.choose_variant')}
        value={component.variant || 'info'}
        onChange={handleVariantClick}
        propertyPath={`${component.propertyPath}/properties/variant`}
      >
        {() => (
          <Select
            options={Object.values(FormPanelVariant).map((value: FormPanelVariant) => ({
              label: t(`ux_editor.${value}`),
              value,
            }))}
          />
        )}
      </FormField>
    </div>
  );
};
