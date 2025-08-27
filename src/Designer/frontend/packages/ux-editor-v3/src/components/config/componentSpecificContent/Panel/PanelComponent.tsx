import React from 'react';
import { Switch } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useText } from '../../../../hooks';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import { FormField } from '../../../FormField';
import { StudioNativeSelect } from '@studio/components-legacy';

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
        renderField={({ fieldProps }) => (
          <Switch
            {...fieldProps}
            checked={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
            size='small'
          >
            {t('ux_editor.show_icon')}
          </Switch>
        )}
      />

      <FormField
        id={`variant-${component.id}`}
        label={t('ux_editor.choose_variant')}
        value={component.variant || 'info'}
        onChange={(value) => handleVariantClick(value as FormPanelVariant)}
        propertyPath={`${component.propertyPath}/properties/variant`}
        renderField={({ fieldProps }) => (
          <StudioNativeSelect id={component.id} {...fieldProps}>
            {Object.values(FormPanelVariant).map((value: FormPanelVariant) => (
              <option key={value} value={value}>
                {t(`ux_editor.${value}`)}
              </option>
            ))}
          </StudioNativeSelect>
        )}
      />
    </>
  );
};
