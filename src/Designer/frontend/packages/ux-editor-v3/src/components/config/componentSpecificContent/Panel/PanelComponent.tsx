import type { IGenericEditComponent } from '../../componentConfig';
import { useText } from '../../../../hooks';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { FormPanelVariant } from 'app-shared/types/FormPanelVariant';
import { FormField } from '../../../FormField';
import { StudioSelect, StudioSwitch } from '@studio/components';

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
          <StudioSwitch
            data-size='sm'
            {...fieldProps}
            checked={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
            label={t('ux_editor.show_icon')}
          />
        )}
      />

      <FormField
        id={`variant-${component.id}`}
        label={t('ux_editor.choose_variant')}
        value={component.variant || 'info'}
        onChange={(value) => handleVariantClick(value as FormPanelVariant)}
        propertyPath={`${component.propertyPath}/properties/variant`}
        renderField={({ fieldProps }) => (
          <StudioSelect id={component.id} {...fieldProps}>
            {Object.values(FormPanelVariant).map((value: FormPanelVariant) => (
              <StudioSelect.Option key={value} value={value}>
                {t(`ux_editor.${value}`)}
              </StudioSelect.Option>
            ))}
          </StudioSelect>
        )}
      />
    </>
  );
};
