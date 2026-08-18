import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import { StudioSwitch } from '@studio/components';

export const EditReadOnly = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleChange = () => {
    handleComponentChange({
      ...component,
      readOnly: !component.readOnly,
    });
  };

  return (
    <FormField
      id={component.id}
      value={component.readOnly || false}
      onChange={handleChange}
      propertyPath='definitions/component/properties/readOnly'
      renderField={({ fieldProps }) => (
        <StudioSwitch
          data-size='sm'
          {...fieldProps}
          checked={fieldProps.value}
          onChange={(e) => fieldProps.onChange(e.target.checked, e)}
          label={t('ux_editor.modal_configure_read_only')}
        />
      )}
    />
  );
};
