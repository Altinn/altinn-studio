import React from 'react';
import { Switch, LegacySelect } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useText } from '../../../../hooks';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import { FormField } from '../../../FormField';
import type { ComponentType } from 'app-shared/types/ComponentType';

export const PanelComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Panel>) => {
  const t = useText();

  const handleShowIconClick = (showIcon: boolean) => {
    handleComponentChange({ ...component, showIcon });
  };

  const handleVariantClick = (variant: FormPanelVariant) => {
    handleComponentChange({ ...component, variant });
  };

  return (
    <>
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
        id={component.id}
        label={t('ux_editor.choose_variant')}
        value={component.variant || 'info'}
        onChange={handleVariantClick}
        propertyPath={`${component.propertyPath}/properties/variant`}
        renderField={({ fieldProps }) => (
          <LegacySelect
            {...fieldProps}
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
